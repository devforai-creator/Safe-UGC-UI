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
  PROTOTYPE_POLLUTION_SEGMENTS,
  isRef,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';

import {
  type TraversableNode,
  type TraversalContext,
  traverseCard,
} from './traverse.js';

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
    // Split by '.' and '[' to extract all path segments
    const segments = refStr.split(/[.\[]/);
    for (const segment of segments) {
      // Remove trailing ']' from bracket access segments
      const clean = segment.replace(/]$/, '');
      if (
        (PROTOTYPE_POLLUTION_SEGMENTS as readonly string[]).includes(clean)
      ) {
        errors.push(
          createError(
            'PROTOTYPE_POLLUTION',
            `$ref "${refStr}" contains forbidden prototype pollution segment "${clean}".`,
            path,
          ),
        );
        // One error per ref is sufficient
        return;
      }
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
// Helper: resolveRefFromState
// ---------------------------------------------------------------------------

/**
 * Resolve a $ref path against a state object. Matches the algorithm in
 * `packages/react/src/state-resolver.ts`:
 *   - Strip leading `$` from the ref path
 *   - Split by `.`, then for each segment extract `[N]` bracket indices
 *   - Traverse state, using numeric indices for arrays
 *   - Block prototype pollution segments
 *
 * @returns The resolved value, or `undefined` if resolution fails.
 */
function resolveRefFromState(
  refPath: string,
  state: Record<string, unknown>,
): unknown {
  // Strip leading $
  const path = refPath.startsWith('$') ? refPath.slice(1) : refPath;
  const dotSegments = path.split('.');

  // Flatten dot-segments into individual traversal keys,
  // expanding bracket notation (e.g. "items[0][1]" → ["items", "0", "1"])
  const keys: string[] = [];
  for (const dotSeg of dotSegments) {
    // Match the base name (before any brackets) and any [N] patterns
    const bracketPattern = /\[(\d+)\]/g;
    const firstBracket = dotSeg.indexOf('[');
    const baseName = firstBracket === -1 ? dotSeg : dotSeg.slice(0, firstBracket);
    if (baseName) {
      keys.push(baseName);
    }
    let match: RegExpExecArray | null;
    while ((match = bracketPattern.exec(dotSeg)) !== null) {
      keys.push(match[1]);
    }
  }

  // Block prototype pollution
  for (const key of keys) {
    if (
      (PROTOTYPE_POLLUTION_SEGMENTS as readonly string[]).includes(key)
    ) {
      return undefined;
    }
  }

  // Traverse state
  let current: unknown = state;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;

    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) return undefined;
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }
  return current;
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
): void {
  if (isForbiddenUrl(resolved)) {
    errors.push(
      createError(
        'EXTERNAL_URL',
        `External URLs are not allowed in ${type}.src. Got "${resolved}".`,
        errorPath,
      ),
    );
  } else {
    const assetError = validateAssetPath(resolved);
    if (assetError === 'ASSET_PATH_TRAVERSAL') {
      errors.push(
        createError(
          'ASSET_PATH_TRAVERSAL',
          `Asset path contains path traversal ("../"). Got "${resolved}".`,
          errorPath,
        ),
      );
    } else if (assetError === 'INVALID_ASSET_PATH') {
      errors.push(
        createError(
          'INVALID_ASSET_PATH',
          `Asset path must start with "@assets/". Got "${resolved}".`,
          errorPath,
        ),
      );
    }
  }
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
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const { views, state, cardAssets, cardStyles } = card;

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

  traverseCard(views, (node: TraversableNode, context: TraversalContext) => {
    const { path } = context;
    const { style, type } = node;
    const nodeFields = { ...node } as Record<string, unknown>;
    delete nodeFields.type;
    delete nodeFields.style;
    delete nodeFields.children;
    delete nodeFields.condition;

    // -----------------------------------------------------------------
    // 1. External URL blocking — Image and Avatar `src`
    // -----------------------------------------------------------------
    if (type === 'Image' || type === 'Avatar') {
      const src = (node as Record<string, unknown>).src;
      if (typeof src === 'string') {
        // Literal string src
        checkSrcValue(src, type, `${path}.src`, errors);
      } else if (isRef(src)) {
        // $ref src — resolve from state if available
        if (state) {
          const resolved = resolveRefFromState(
            (src as { $ref: string }).$ref,
            state,
          );
          if (typeof resolved === 'string') {
            checkSrcValue(resolved, type, `${path}.src`, errors);
          }
          // If resolution fails (undefined), skip — may be a loop-local variable
        }
        // If no state provided, skip $ref resolution
      }
    }

    // -----------------------------------------------------------------
    // 2. Scan all style string values for `url()` pattern
    // -----------------------------------------------------------------
    if (style) {
      for (const [prop, value] of Object.entries(style)) {
        if (typeof value === 'string' && value.toLowerCase().includes('url(')) {
          errors.push(
            createError(
              'FORBIDDEN_CSS_FUNCTION',
              `CSS url() function is forbidden in style values. Found in "${prop}".`,
              `${path}.style.${prop}`,
            ),
          );
        }
      }
    }

    // -----------------------------------------------------------------
    // 3. Position rules (use merged style if $style is present)
    // -----------------------------------------------------------------
    // Build effective style by merging with card.styles if $style is present
    let effectiveStyle = style;
    if (
      style &&
      typeof style.$style === 'string' &&
      cardStyles &&
      style.$style.trim() in cardStyles
    ) {
      const refName = style.$style.trim();
      const merged: Record<string, unknown> = { ...cardStyles[refName] };
      for (const [key, value] of Object.entries(style)) {
        if (key !== '$style') {
          merged[key] = value;
        }
      }
      effectiveStyle = merged;
    }

    if (effectiveStyle && typeof effectiveStyle.position === 'string') {
      const position = effectiveStyle.position;

      if (position === 'fixed') {
        errors.push(
          createError(
            'POSITION_FIXED_FORBIDDEN',
            'CSS position "fixed" is not allowed.',
            `${path}.style.position`,
          ),
        );
      } else if (position === 'sticky') {
        errors.push(
          createError(
            'POSITION_STICKY_FORBIDDEN',
            'CSS position "sticky" is not allowed.',
            `${path}.style.position`,
          ),
        );
      } else if (position === 'absolute') {
        if (context.parentType !== 'Stack') {
          errors.push(
            createError(
              'POSITION_ABSOLUTE_NOT_IN_STACK',
              'CSS position "absolute" is only allowed inside a Stack component.',
              `${path}.style.position`,
            ),
          );
        }
      }
    }

    // -----------------------------------------------------------------
    // 4. Overflow auto nesting (use merged style)
    // -----------------------------------------------------------------
    if (
      effectiveStyle &&
      effectiveStyle.overflow === 'auto' &&
      context.overflowAutoAncestor
    ) {
      errors.push(
        createError(
          'OVERFLOW_AUTO_NESTED',
          'Nested overflow:auto is not allowed. An ancestor already has overflow:auto.',
          `${path}.style.overflow`,
        ),
      );
    }

    // -----------------------------------------------------------------
    // 5. Prototype pollution check on $ref values in node fields and style
    // -----------------------------------------------------------------
    scanForRefs(nodeFields, path, errors);
    if (style) {
      scanForRefs(style, `${path}.style`, errors);
    }
  });

  return errors;
}
