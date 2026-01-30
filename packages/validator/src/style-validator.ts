/**
 * @safe-ugc-ui/validator — Style Validator
 *
 * Validates style properties according to the spec's style restrictions:
 *   - Forbidden CSS properties (spec 3.8)
 *   - Numeric range limits (spec 6.4)
 *   - Box-shadow count and value limits
 *   - Transform skew prohibition
 *   - Dangerous CSS function injection detection
 *   - Overflow: scroll prohibition (defense-in-depth)
 */

import {
  FORBIDDEN_STYLE_PROPERTIES,
  DANGEROUS_CSS_FUNCTIONS,
  ZINDEX_MIN,
  ZINDEX_MAX,
  TRANSFORM_SCALE_MIN,
  TRANSFORM_SCALE_MAX,
  TRANSFORM_TRANSLATE_MIN,
  TRANSFORM_TRANSLATE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  BOX_SHADOW_MAX_COUNT,
  BOX_SHADOW_BLUR_MAX,
  BOX_SHADOW_SPREAD_MAX,
  BORDER_RADIUS_MAX,
  LETTER_SPACING_MIN,
  LETTER_SPACING_MAX,
  OPACITY_MIN,
  OPACITY_MAX,
  isRef,
  isExpr,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { type TraversableNode, type TraversalContext, traverseCard } from './traverse.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true only if the value is a literal number (not a $ref or $expr).
 */
function isLiteralNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Returns true if the value is a dynamic binding ($ref or $expr) that should
 * be skipped for static range checks.
 */
function isDynamic(value: unknown): boolean {
  return isRef(value) || isExpr(value);
}

/**
 * Recursively scan all string values in a value (which may be a string,
 * object, or array) for dangerous CSS function patterns.
 * Skips $ref and $expr objects entirely.
 */
function collectDangerousCssErrors(
  value: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    for (const fn of DANGEROUS_CSS_FUNCTIONS) {
      if (lower.includes(fn)) {
        errors.push(
          createError(
            'FORBIDDEN_CSS_FUNCTION',
            `Style value contains forbidden CSS function "${fn.slice(0, -1)}" at "${path}"`,
            path,
          ),
        );
        // Report only the first match per string to keep errors concise
        break;
      }
    }
    return;
  }

  // Skip $ref / $expr objects — they are not user-authored strings
  if (isRef(value) || isExpr(value)) {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectDangerousCssErrors(value[i], `${path}[${i}]`, errors);
    }
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectDangerousCssErrors(child, `${path}.${key}`, errors);
    }
  }
}

/**
 * Validate a single shadow object's blur and spread values.
 */
function validateShadowObject(
  shadow: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (
    isLiteralNumber(shadow.blur) &&
    shadow.blur > BOX_SHADOW_BLUR_MAX
  ) {
    errors.push(
      createError(
        'STYLE_VALUE_OUT_OF_RANGE',
        `boxShadow blur (${shadow.blur}) exceeds maximum of ${BOX_SHADOW_BLUR_MAX} at "${path}.blur"`,
        `${path}.blur`,
      ),
    );
  }

  if (
    isLiteralNumber(shadow.spread) &&
    shadow.spread > BOX_SHADOW_SPREAD_MAX
  ) {
    errors.push(
      createError(
        'STYLE_VALUE_OUT_OF_RANGE',
        `boxShadow spread (${shadow.spread}) exceeds maximum of ${BOX_SHADOW_SPREAD_MAX} at "${path}.spread"`,
        `${path}.spread`,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Validate all style properties across every node in the card's view tree.
 *
 * Checks:
 *   1. Forbidden style properties (spec 3.8)
 *   2. Numeric range limits (spec 6.4)
 *   3. Box-shadow count and value limits
 *   4. Transform skew prohibition
 *   5. CSS function injection in string values
 *   6. Overflow: scroll prohibition (defense-in-depth)
 */
export function validateStyles(
  views: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  traverseCard(views, (node: TraversableNode, ctx: TraversalContext) => {
    const style = node.style;
    if (style == null || typeof style !== 'object') {
      return;
    }

    const stylePath = `${ctx.path}.style`;

    // ------------------------------------------------------------------
    // 1. Forbidden properties (spec 3.8)
    // ------------------------------------------------------------------
    for (const key of Object.keys(style)) {
      if (
        (FORBIDDEN_STYLE_PROPERTIES as readonly string[]).includes(key)
      ) {
        errors.push(
          createError(
            'FORBIDDEN_STYLE_PROPERTY',
            `Style property "${key}" is forbidden at "${stylePath}.${key}"`,
            `${stylePath}.${key}`,
          ),
        );
      }
    }

    // ------------------------------------------------------------------
    // 2. Numeric range checks (spec 6.4)
    // ------------------------------------------------------------------

    // zIndex: ZINDEX_MIN..ZINDEX_MAX
    if ('zIndex' in style && isLiteralNumber(style.zIndex)) {
      const v = style.zIndex;
      if (v < ZINDEX_MIN || v > ZINDEX_MAX) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `zIndex (${v}) must be between ${ZINDEX_MIN} and ${ZINDEX_MAX} at "${stylePath}.zIndex"`,
            `${stylePath}.zIndex`,
          ),
        );
      }
    }

    // fontSize: FONT_SIZE_MIN..FONT_SIZE_MAX
    if ('fontSize' in style && isLiteralNumber(style.fontSize)) {
      const v = style.fontSize;
      if (v < FONT_SIZE_MIN || v > FONT_SIZE_MAX) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `fontSize (${v}) must be between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX} at "${stylePath}.fontSize"`,
            `${stylePath}.fontSize`,
          ),
        );
      }
    }

    // opacity: OPACITY_MIN..OPACITY_MAX
    if ('opacity' in style && isLiteralNumber(style.opacity)) {
      const v = style.opacity;
      if (v < OPACITY_MIN || v > OPACITY_MAX) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `opacity (${v}) must be between ${OPACITY_MIN} and ${OPACITY_MAX} at "${stylePath}.opacity"`,
            `${stylePath}.opacity`,
          ),
        );
      }
    }

    // letterSpacing: LETTER_SPACING_MIN..LETTER_SPACING_MAX
    if ('letterSpacing' in style && isLiteralNumber(style.letterSpacing)) {
      const v = style.letterSpacing;
      if (v < LETTER_SPACING_MIN || v > LETTER_SPACING_MAX) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `letterSpacing (${v}) must be between ${LETTER_SPACING_MIN} and ${LETTER_SPACING_MAX} at "${stylePath}.letterSpacing"`,
            `${stylePath}.letterSpacing`,
          ),
        );
      }
    }

    // borderRadius: 0..BORDER_RADIUS_MAX
    if ('borderRadius' in style && isLiteralNumber(style.borderRadius)) {
      const v = style.borderRadius;
      if (v < 0 || v > BORDER_RADIUS_MAX) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `borderRadius (${v}) must be between 0 and ${BORDER_RADIUS_MAX} at "${stylePath}.borderRadius"`,
            `${stylePath}.borderRadius`,
          ),
        );
      }
    }

    // transform sub-properties
    if (
      'transform' in style &&
      typeof style.transform === 'object' &&
      style.transform !== null &&
      !isDynamic(style.transform)
    ) {
      const transform = style.transform as Record<string, unknown>;
      const transformPath = `${stylePath}.transform`;

      // scale: TRANSFORM_SCALE_MIN..TRANSFORM_SCALE_MAX
      if ('scale' in transform && isLiteralNumber(transform.scale)) {
        const v = transform.scale;
        if (v < TRANSFORM_SCALE_MIN || v > TRANSFORM_SCALE_MAX) {
          errors.push(
            createError(
              'STYLE_VALUE_OUT_OF_RANGE',
              `transform.scale (${v}) must be between ${TRANSFORM_SCALE_MIN} and ${TRANSFORM_SCALE_MAX} at "${transformPath}.scale"`,
              `${transformPath}.scale`,
            ),
          );
        }
      }

      // translateX: TRANSFORM_TRANSLATE_MIN..TRANSFORM_TRANSLATE_MAX
      if ('translateX' in transform && isLiteralNumber(transform.translateX)) {
        const v = transform.translateX;
        if (v < TRANSFORM_TRANSLATE_MIN || v > TRANSFORM_TRANSLATE_MAX) {
          errors.push(
            createError(
              'STYLE_VALUE_OUT_OF_RANGE',
              `transform.translateX (${v}) must be between ${TRANSFORM_TRANSLATE_MIN} and ${TRANSFORM_TRANSLATE_MAX} at "${transformPath}.translateX"`,
              `${transformPath}.translateX`,
            ),
          );
        }
      }

      // translateY: TRANSFORM_TRANSLATE_MIN..TRANSFORM_TRANSLATE_MAX
      if ('translateY' in transform && isLiteralNumber(transform.translateY)) {
        const v = transform.translateY;
        if (v < TRANSFORM_TRANSLATE_MIN || v > TRANSFORM_TRANSLATE_MAX) {
          errors.push(
            createError(
              'STYLE_VALUE_OUT_OF_RANGE',
              `transform.translateY (${v}) must be between ${TRANSFORM_TRANSLATE_MIN} and ${TRANSFORM_TRANSLATE_MAX} at "${transformPath}.translateY"`,
              `${transformPath}.translateY`,
            ),
          );
        }
      }

      // ------------------------------------------------------------------
      // 4. Transform skew forbidden
      // ------------------------------------------------------------------
      if ('skew' in transform) {
        errors.push(
          createError(
            'TRANSFORM_SKEW_FORBIDDEN',
            `transform.skew is forbidden at "${transformPath}.skew"`,
            `${transformPath}.skew`,
          ),
        );
      }
    }

    // ------------------------------------------------------------------
    // 3. Box-shadow limits
    // ------------------------------------------------------------------
    if ('boxShadow' in style && style.boxShadow != null) {
      const boxShadow = style.boxShadow;
      const boxShadowPath = `${stylePath}.boxShadow`;

      if (Array.isArray(boxShadow)) {
        // Array of shadows — check count
        if (boxShadow.length > BOX_SHADOW_MAX_COUNT) {
          errors.push(
            createError(
              'STYLE_VALUE_OUT_OF_RANGE',
              `boxShadow has ${boxShadow.length} entries, maximum is ${BOX_SHADOW_MAX_COUNT} at "${boxShadowPath}"`,
              boxShadowPath,
            ),
          );
        }

        // Check each shadow's blur/spread
        for (let i = 0; i < boxShadow.length; i++) {
          const shadow = boxShadow[i];
          if (typeof shadow === 'object' && shadow !== null) {
            validateShadowObject(
              shadow as Record<string, unknown>,
              `${boxShadowPath}[${i}]`,
              errors,
            );
          }
        }
      } else if (typeof boxShadow === 'object' && boxShadow !== null) {
        // Single shadow object
        validateShadowObject(
          boxShadow as Record<string, unknown>,
          boxShadowPath,
          errors,
        );
      }
    }

    // ------------------------------------------------------------------
    // 5. CSS function injection — scan all string values
    // ------------------------------------------------------------------
    for (const [key, value] of Object.entries(style)) {
      collectDangerousCssErrors(value, `${stylePath}.${key}`, errors);
    }

    // ------------------------------------------------------------------
    // 6. Overflow: scroll forbidden (defense-in-depth)
    // ------------------------------------------------------------------
    if ('overflow' in style && style.overflow === 'scroll') {
      errors.push(
        createError(
          'FORBIDDEN_OVERFLOW_VALUE',
          `overflow "scroll" is forbidden; use "visible", "hidden", or "auto" at "${stylePath}.overflow"`,
          `${stylePath}.overflow`,
        ),
      );
    }
  });

  return errors;
}
