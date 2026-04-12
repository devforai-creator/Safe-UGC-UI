/**
 * @safe-ugc-ui/validator — Security Validation
 *
 * Enforces security rules from spec sections 3 and 8:
 *   - External URL blocking on Image/Avatar `src` fields (literal and $ref)
 *   - Asset path validation (`@assets/` prefix, no traversal)
 *   - cardAssets value validation
 *   - Forbidden CSS `url()` function in style string values
 *   - Position restrictions (fixed, sticky, absolute outside Stack)
 *   - Nested overflow:auto detection
 *   - Prototype pollution prevention in $ref paths
 */

import {
  MAX_LOOP_ITERATIONS,
  hasForbiddenRefPathSegments,
  isRef,
  parseRefPathSegments,
  resolveRefPathSegments,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';

import {
  getEmbeddedRenderables,
  isFragmentUseLike,
  isTraversableNode,
  type TraversableNode,
  type TraversalContext,
  traverseCard,
} from './traverse.js';
import { walkRenderableCard } from './renderable-walk.js';
import {
  type ResponsiveMode,
  RESPONSIVE_MODES,
  getEffectiveStyleForMode,
} from './responsive-utils.js';

const RESPONSIVE_OVERRIDE_KEYS = ['medium', 'compact'] as const;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * URL prefixes that are forbidden in Image/Avatar `src` values.
 * Checked case-insensitively to prevent bypass via mixed case.
 */
const FORBIDDEN_URL_PREFIXES = [
  'http://',
  'https://',
  '//',
  'data:',
  'javascript:',
] as const;

// ---------------------------------------------------------------------------
// Helper: scanForRefs — recursively find $ref values for pollution check
// ---------------------------------------------------------------------------

/**
 * Recursively walk an unknown value looking for `{ $ref: string }` objects.
 * For each one found, verify the ref path segments do not contain
 * prototype pollution keys (`__proto__`, `constructor`, `prototype`).
 *
 * @param obj  - The value to scan (may be primitive, array, or object).
 * @param path - The JSON-pointer-like location for error reporting.
 * @param errors - Accumulator for any validation errors found.
 */
function scanForRefs(
  obj: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return;
  }

  // Check if this object is a $ref
  if (isRef(obj)) {
    const refStr = (obj as { $ref: string }).$ref;
    const segments = parseRefPathSegments(refStr);
    const offendingSegment = segments.find((segment) =>
      hasForbiddenRefPathSegments([segment]),
    );
    if (offendingSegment) {
      errors.push(
        createError(
          'PROTOTYPE_POLLUTION',
          `$ref "${refStr}" contains forbidden prototype pollution segment "${offendingSegment}".`,
          path,
        ),
      );
      return;
    }
    return;
  }

  // Recurse into arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      scanForRefs(obj[i], `${path}[${i}]`, errors);
    }
    return;
  }

  // Recurse into plain objects
  for (const [key, value] of Object.entries(obj)) {
    scanForRefs(value, `${path}.${key}`, errors);
  }
}

// ---------------------------------------------------------------------------
// Helper: isForbiddenUrl
// ---------------------------------------------------------------------------

/**
 * Returns true if the string starts with any forbidden URL prefix
 * (case-insensitive comparison).
 */
function isForbiddenUrl(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return FORBIDDEN_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Helper: validateAssetPath
// ---------------------------------------------------------------------------

/**
 * Validates an asset path string. Must start with `@assets/` and must not
 * contain path traversal sequences.
 *
 * @returns An error code if invalid, or null if the path is acceptable.
 */
function validateAssetPath(
  value: string,
): 'ASSET_PATH_TRAVERSAL' | 'INVALID_ASSET_PATH' | null {
  if (!value.startsWith('@assets/')) {
    return 'INVALID_ASSET_PATH';
  }
  if (value.includes('../')) {
    return 'ASSET_PATH_TRAVERSAL';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper: checkSrcValue
// ---------------------------------------------------------------------------

/**
 * Check a resolved src string value and push appropriate errors.
 */
function checkSrcValue(
  resolved: string,
  type: string,
  errorPath: string,
  errors: ValidationError[],
  seen?: Set<string>,
): void {
  if (isForbiddenUrl(resolved)) {
    const error = createError(
      'EXTERNAL_URL',
      `External URLs are not allowed in ${type}.src. Got "${resolved}".`,
      errorPath,
    );
    if (seen) {
      pushUniqueError(errors, seen, error);
    } else {
      errors.push(error);
    }
  } else {
    const assetError = validateAssetPath(resolved);
    if (assetError === 'ASSET_PATH_TRAVERSAL') {
      const error = createError(
        'ASSET_PATH_TRAVERSAL',
        `Asset path contains path traversal ("../"). Got "${resolved}".`,
        errorPath,
      );
      if (seen) {
        pushUniqueError(errors, seen, error);
      } else {
        errors.push(error);
      }
    } else if (assetError === 'INVALID_ASSET_PATH') {
      const error = createError(
        'INVALID_ASSET_PATH',
        `Asset path must start with "@assets/". Got "${resolved}".`,
        errorPath,
      );
      if (seen) {
        pushUniqueError(errors, seen, error);
      } else {
        errors.push(error);
      }
    }
  }
}

function pushUniqueError(
  errors: ValidationError[],
  seen: Set<string>,
  error: ValidationError,
): void {
  const key = `${error.code}|${error.path}|${error.message}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  errors.push(error);
}

function isForLoopLike(
  value: unknown,
): value is { for: string; in: string; template: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).for === 'string' &&
    typeof (value as Record<string, unknown>).in === 'string' &&
    'template' in (value as Record<string, unknown>)
  );
}

function resolveRefWithLocals(
  refPath: string,
  state: Record<string, unknown> | undefined,
  locals?: Record<string, unknown>,
): unknown {
  const segments = parseRefPathSegments(refPath);
  const firstSeg = segments[0];
  const root =
    locals && firstSeg && firstSeg in locals
      ? locals
      : state;

  if (!root) {
    return undefined;
  }

  return resolveRefPathSegments(segments, root);
}

function validateResolvedAssetSrcsForRenderable(
  renderable: unknown,
  path: string,
  state: Record<string, unknown> | undefined,
  fragments: Record<string, unknown> | undefined,
  errors: ValidationError[],
  seen: Set<string>,
  locals?: Record<string, unknown>,
  fragmentStack: string[] = [],
): void {
  if (isFragmentUseLike(renderable)) {
    if (fragmentStack.includes(renderable.$use)) {
      return;
    }

    const target = fragments?.[renderable.$use];
    if (!target) {
      return;
    }

    validateResolvedAssetSrcsForRenderable(
      target,
      path,
      state,
      fragments,
      errors,
      seen,
      locals,
      [...fragmentStack, renderable.$use],
    );
    return;
  }

  if (!isTraversableNode(renderable)) {
    return;
  }

  if (renderable.type === 'Image' || renderable.type === 'Avatar') {
    const src = (renderable as Record<string, unknown>).src;
    if (typeof src === 'string') {
      checkSrcValue(src, renderable.type, `${path}.src`, errors, seen);
    } else if (isRef(src)) {
      const resolved = resolveRefWithLocals(src.$ref, state, locals);
      if (typeof resolved === 'string') {
        checkSrcValue(resolved, renderable.type, `${path}.src`, errors, seen);
      }
    }
  }

  const children = renderable.children;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      validateResolvedAssetSrcsForRenderable(
        children[i],
        `${path}.children[${i}]`,
        state,
        fragments,
        errors,
        seen,
        locals,
        fragmentStack,
      );
    }
  } else if (isForLoopLike(children)) {
    validateResolvedAssetSrcsForRenderable(
      children.template,
      `${path}.children.template`,
      state,
      fragments,
      errors,
      seen,
      locals,
      fragmentStack,
    );

    const source = resolveRefWithLocals(children.in, state, locals);
    if (Array.isArray(source)) {
      const maxIter = Math.min(source.length, MAX_LOOP_ITERATIONS);
      for (let i = 0; i < maxIter; i++) {
        const nextLocals: Record<string, unknown> = {
          ...(locals ?? {}),
          [children.for]: source[i],
          index: i,
        };
        validateResolvedAssetSrcsForRenderable(
          children.template,
          `${path}.children.template`,
          state,
          fragments,
          errors,
          seen,
          nextLocals,
          fragmentStack,
        );
      }
    }
  }

  for (const entry of getEmbeddedRenderables(renderable)) {
    validateResolvedAssetSrcsForRenderable(
      entry.renderable,
      `${path}.${entry.pathSuffix}`,
      state,
      fragments,
      errors,
      seen,
      locals,
      fragmentStack,
    );
  }
}

function validateResolvedAssetSrcs(
  views: Record<string, unknown>,
  state: Record<string, unknown> | undefined,
  fragments: Record<string, unknown> | undefined,
  errors: ValidationError[],
  seen: Set<string>,
): void {
  for (const [viewName, rootNode] of Object.entries(views)) {
    validateResolvedAssetSrcsForRenderable(
      rootNode,
      `views.${viewName}`,
      state,
      fragments,
      errors,
      seen,
    );
  }

  if (!fragments) {
    return;
  }

  for (const [fragmentName, fragmentRoot] of Object.entries(fragments)) {
    validateResolvedAssetSrcsForRenderable(
      fragmentRoot,
      `fragments.${fragmentName}`,
      state,
      fragments,
      errors,
      seen,
    );
  }
}

function getScannableNodeFields(
  node: TraversableNode,
): Record<string, unknown> {
  const nodeFields = { ...node } as Record<string, unknown>;
  delete nodeFields.type;
  delete nodeFields.style;
  delete nodeFields.children;

  if (node.type === 'Switch') {
    delete nodeFields.cases;
    delete nodeFields.default;
  }

  const interactiveField =
    node.type === 'Accordion'
      ? 'items'
      : node.type === 'Tabs'
        ? 'tabs'
        : null;

  if (interactiveField && Array.isArray(node[interactiveField])) {
    nodeFields[interactiveField] = node[interactiveField].map((item) => {
      if (
        item == null ||
        typeof item !== 'object' ||
        Array.isArray(item)
      ) {
        return item;
      }

      const { content: _content, ...rest } = item as Record<string, unknown>;
      return rest;
    });
  }

  return nodeFields;
}

function scanStyleStringsForUrl(
  style: Record<string, unknown> | undefined,
  path: string,
  errors: ValidationError[],
): void {
  if (!style) {
    return;
  }

  for (const [prop, value] of Object.entries(style)) {
    if (typeof value === 'string' && value.toLowerCase().includes('url(')) {
      errors.push(
        createError(
          'FORBIDDEN_CSS_FUNCTION',
          `CSS url() function is forbidden in style values. Found in "${prop}".`,
          `${path}.${prop}`,
        ),
      );
    }
  }
}

function validateEffectiveStylesForMode(
  mode: ResponsiveMode,
  views: Record<string, unknown>,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  fragments: Record<string, unknown> | undefined,
  errors: ValidationError[],
  seen: Set<string>,
): void {
  const styleResolver = (node: TraversableNode) =>
    getEffectiveStyleForMode(node, cardStyles, mode);

  traverseCard(views, (node: TraversableNode, context: TraversalContext) => {
    const effectiveStyle = styleResolver(node);

    if (effectiveStyle && typeof effectiveStyle.position === 'string') {
      const position = effectiveStyle.position;

      if (position === 'fixed') {
        pushUniqueError(
          errors,
          seen,
          createError(
            'POSITION_FIXED_FORBIDDEN',
            'CSS position "fixed" is not allowed.',
            `${context.path}.style.position`,
          ),
        );
      } else if (position === 'sticky') {
        pushUniqueError(
          errors,
          seen,
          createError(
            'POSITION_STICKY_FORBIDDEN',
            'CSS position "sticky" is not allowed.',
            `${context.path}.style.position`,
          ),
        );
      } else if (position === 'absolute' && context.parentType !== 'Stack') {
        pushUniqueError(
          errors,
          seen,
          createError(
            'POSITION_ABSOLUTE_NOT_IN_STACK',
            'CSS position "absolute" is only allowed inside a Stack component.',
            `${context.path}.style.position`,
          ),
        );
      }
    }

    if (
      effectiveStyle &&
      effectiveStyle.overflow === 'auto' &&
      context.overflowAutoAncestor
    ) {
      pushUniqueError(
        errors,
        seen,
        createError(
          'OVERFLOW_AUTO_NESTED',
          'Nested overflow:auto is not allowed. An ancestor already has overflow:auto.',
          `${context.path}.style.overflow`,
        ),
      );
    }
  }, styleResolver, fragments);
}

// ---------------------------------------------------------------------------
// validateSecurity
// ---------------------------------------------------------------------------

/**
 * Run all security validation rules against every node in every view.
 *
 * Rules checked (spec sections 3 and 8):
 *   1. External URL blocking on Image/Avatar `src` (literal and $ref)
 *   2. Asset path validation
 *   3. cardAssets value validation
 *   4. Forbidden CSS `url()` in style string values
 *   5. Position restrictions (fixed, sticky, absolute outside Stack)
 *   6. Nested overflow:auto
 *   7. Prototype pollution in $ref paths
 *
 * @param card - Object containing `views`, optional `state`, and optional `cardAssets`.
 * @returns An array of validation errors (empty if all rules pass).
 */
export function validateSecurity(card: {
  views: Record<string, unknown>;
  state?: Record<string, unknown>;
  cardAssets?: Record<string, string>;
  cardStyles?: Record<string, Record<string, unknown>>;
  fragments?: Record<string, unknown>;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  const { views, state, cardAssets, cardStyles, fragments } = card;

  // -----------------------------------------------------------------
  // 0. Validate cardAssets values
  // -----------------------------------------------------------------
  if (cardAssets) {
    for (const [key, value] of Object.entries(cardAssets)) {
      const assetError = validateAssetPath(value);
      if (assetError === 'ASSET_PATH_TRAVERSAL') {
        errors.push(
          createError(
            'ASSET_PATH_TRAVERSAL',
            `Asset path contains path traversal ("../"). Got "${value}".`,
            `assets.${key}`,
          ),
        );
      } else if (assetError === 'INVALID_ASSET_PATH') {
        errors.push(
          createError(
            'INVALID_ASSET_PATH',
            `Asset path must start with "@assets/". Got "${value}".`,
            `assets.${key}`,
          ),
        );
      }
    }
  }

  validateResolvedAssetSrcs(views, state, fragments, errors, seen);

  walkRenderableCard(views, fragments, (node, context) => {
    if (!('type' in node) || typeof node.type !== 'string') {
      return;
    }

    const traversableNode = node as TraversableNode;
    const { path } = context;
    const style =
      traversableNode.style != null &&
      typeof traversableNode.style === 'object' &&
      !Array.isArray(traversableNode.style)
        ? traversableNode.style as Record<string, unknown>
        : undefined;
    const type = traversableNode.type;
    const nodeFields = getScannableNodeFields(traversableNode);

    // -----------------------------------------------------------------
    // 1. Scan all style string values for `url()` pattern
    // -----------------------------------------------------------------
    scanStyleStringsForUrl(style, `${path}.style`, errors);

    const responsive = traversableNode.responsive;
    if (
      responsive != null &&
      typeof responsive === 'object' &&
      !Array.isArray(responsive)
    ) {
      for (const mode of RESPONSIVE_OVERRIDE_KEYS) {
        const override = (responsive as Record<string, unknown>)[mode];
        if (
          override != null &&
          typeof override === 'object' &&
          !Array.isArray(override)
        ) {
          scanStyleStringsForUrl(
            override as Record<string, unknown>,
            `${path}.responsive.${mode}`,
            errors,
          );
        }
      }
    }

    if (type === 'Text' && Array.isArray((traversableNode as Record<string, unknown>).spans)) {
      const spans = (traversableNode as Record<string, unknown>).spans as unknown[];
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        if (
          span == null ||
          typeof span !== 'object' ||
          Array.isArray(span)
        ) {
          continue;
        }

        const spanStyle = (span as Record<string, unknown>).style;
        if (
          spanStyle != null &&
          typeof spanStyle === 'object' &&
          !Array.isArray(spanStyle)
        ) {
          scanStyleStringsForUrl(
            spanStyle as Record<string, unknown>,
            `${path}.spans[${i}].style`,
            errors,
          );
        }
      }
    }

    // -----------------------------------------------------------------
    // 2. Prototype pollution check on $ref values in node fields and style
    // -----------------------------------------------------------------
    scanForRefs(nodeFields, path, errors);
    if (style) {
      scanForRefs(style, `${path}.style`, errors);
    }
    if (
      responsive != null &&
      typeof responsive === 'object' &&
      !Array.isArray(responsive)
    ) {
      scanForRefs(responsive, `${path}.responsive`, errors);
    }
  });

  for (const mode of RESPONSIVE_MODES) {
    validateEffectiveStylesForMode(mode, views, cardStyles, fragments, errors, seen);
  }

  return errors;
}
