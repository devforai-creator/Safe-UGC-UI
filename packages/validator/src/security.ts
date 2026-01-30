/**
 * @safe-ugc-ui/validator — Security Validation
 *
 * Enforces security rules from spec sections 3 and 8:
 *   - External URL blocking on Image/Avatar `src` props
 *   - Asset path validation (`@assets/` prefix, no traversal)
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
// Helper: checkExternalUrl
// ---------------------------------------------------------------------------

/**
 * Returns true if the string starts with any forbidden URL prefix
 * (case-insensitive comparison).
 */
function isForbiddenUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Helper: checkAssetPath
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
// validateSecurity
// ---------------------------------------------------------------------------

/**
 * Run all security validation rules against every node in every view.
 *
 * Rules checked (spec sections 3 and 8):
 *   1. External URL blocking on Image/Avatar `src`
 *   2. Asset path validation
 *   3. Forbidden CSS `url()` in style string values
 *   4. Position restrictions (fixed, sticky, absolute outside Stack)
 *   5. Nested overflow:auto
 *   6. Prototype pollution in $ref paths
 *
 * @param views - The `views` object from a UGCCard.
 * @returns An array of validation errors (empty if all rules pass).
 */
export function validateSecurity(
  views: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  traverseCard(views, (node: TraversableNode, context: TraversalContext) => {
    const { path } = context;
    const { props, style, type } = node;

    // -----------------------------------------------------------------
    // 1. External URL blocking — Image and Avatar `src`
    // -----------------------------------------------------------------
    if ((type === 'Image' || type === 'Avatar') && props) {
      const src = props.src;
      if (typeof src === 'string') {
        if (isForbiddenUrl(src)) {
          errors.push(
            createError(
              'EXTERNAL_URL',
              `External URLs are not allowed in ${type}.props.src. Got "${src}".`,
              `${path}.props.src`,
            ),
          );
        } else {
          // If it is not an external URL, it should be a valid asset path
          const assetError = validateAssetPath(src);
          if (assetError === 'ASSET_PATH_TRAVERSAL') {
            errors.push(
              createError(
                'ASSET_PATH_TRAVERSAL',
                `Asset path contains path traversal ("../"). Got "${src}".`,
                `${path}.props.src`,
              ),
            );
          } else if (assetError === 'INVALID_ASSET_PATH') {
            errors.push(
              createError(
                'INVALID_ASSET_PATH',
                `Asset path must start with "@assets/". Got "${src}".`,
                `${path}.props.src`,
              ),
            );
          }
        }
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
    // 3. Position rules
    // -----------------------------------------------------------------
    if (style && typeof style.position === 'string') {
      const position = style.position;

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
    // 4. Overflow auto nesting
    // -----------------------------------------------------------------
    if (
      style &&
      style.overflow === 'auto' &&
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
    // 5. Prototype pollution check on $ref values in props and style
    // -----------------------------------------------------------------
    if (props) {
      scanForRefs(props, `${path}.props`, errors);
    }
    if (style) {
      scanForRefs(style, `${path}.style`, errors);
    }
  });

  return errors;
}
