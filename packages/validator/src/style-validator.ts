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
 *   - Color format validation
 *   - Length format validation
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
  CSS_NAMED_COLORS,
  isRef,
  isExpr,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { type TraversableNode, type TraversalContext, traverseCard } from './traverse.js';

// ---------------------------------------------------------------------------
// Property sets
// ---------------------------------------------------------------------------

const COLOR_PROPERTIES = new Set(['backgroundColor', 'color']);

const LENGTH_PROPERTIES = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'top', 'right', 'bottom', 'left', 'gap', 'lineHeight',
]);

const LENGTH_AUTO_ALLOWED = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
]);

// Properties that have range limits AND accept string lengths
const RANGE_LENGTH_PROPERTIES: Record<string, { min: number; max: number }> = {
  fontSize: { min: FONT_SIZE_MIN, max: FONT_SIZE_MAX },
  letterSpacing: { min: LETTER_SPACING_MIN, max: LETTER_SPACING_MAX },
  borderRadius: { min: 0, max: BORDER_RADIUS_MAX },
  borderRadiusTopLeft: { min: 0, max: BORDER_RADIUS_MAX },
  borderRadiusTopRight: { min: 0, max: BORDER_RADIUS_MAX },
  borderRadiusBottomLeft: { min: 0, max: BORDER_RADIUS_MAX },
  borderRadiusBottomRight: { min: 0, max: BORDER_RADIUS_MAX },
};

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
 * Returns true only if the value is a literal string (not a $ref or $expr).
 */
function isLiteralString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Returns true if the value is a dynamic binding ($ref or $expr) that should
 * be skipped for static range checks.
 */
function isDynamic(value: unknown): boolean {
  return isRef(value) || isExpr(value);
}

/**
 * Returns true if the string is a valid CSS color value.
 *
 * Supported formats:
 *   - Hex: #RGB, #RRGGBB, #RRGGBBAA
 *   - Functional: rgb(...), rgba(...), hsl(...), hsla(...)
 *   - Named CSS colors (148 standard keywords)
 *   - Special keywords: transparent, currentcolor
 */
function isValidColor(value: string): boolean {
  const lower = value.toLowerCase();

  // Hex colors
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(lower)) {
    return true;
  }

  // Functional color notations
  if (
    lower.startsWith('rgb(') ||
    lower.startsWith('rgba(') ||
    lower.startsWith('hsl(') ||
    lower.startsWith('hsla(')
  ) {
    return true;
  }

  // Named CSS colors
  if (CSS_NAMED_COLORS.has(lower)) {
    return true;
  }

  // Special keywords
  if (lower === 'transparent' || lower === 'currentcolor') {
    return true;
  }

  return false;
}

/**
 * Returns true if the string is a valid CSS length value.
 *
 * Allowed pattern: optional negative sign, digits (with optional decimal),
 * and optional unit (px, %, em, rem).
 *
 * NOTE: `auto` is NOT checked here — it's handled separately per property.
 */
function isValidLength(value: string): boolean {
  return /^-?[0-9]+(\.[0-9]+)?(px|%|em|rem)?$/.test(value);
}

/**
 * Extract the numeric part from a length string like "42px", "50%", "16em",
 * "1.5rem", or "100".
 *
 * Returns the number, or null if it can't be parsed.
 */
function parseLengthValue(value: string): number | null {
  const match = value.match(/^(-?[0-9]+(\.[0-9]+)?)(px|%|em|rem)?$/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
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
 * Validate a single shadow object's blur and spread values,
 * and its color if present.
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

  // Validate shadow color
  if (isLiteralString(shadow.color) && !isValidColor(shadow.color)) {
    errors.push(
      createError(
        'INVALID_COLOR',
        `Invalid color "${shadow.color}" at "${path}.color"`,
        `${path}.color`,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Regex for valid $style references and style names
// ---------------------------------------------------------------------------

const STYLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

// ---------------------------------------------------------------------------
// validateSingleStyle — reusable per-style validation logic
// ---------------------------------------------------------------------------

/**
 * Validate a single style object's properties.
 *
 * Checks:
 *   1. Forbidden style properties (spec 3.8)
 *   2. Numeric range limits (spec 6.4)
 *   3. Box-shadow count and value limits
 *   4. Transform skew prohibition
 *   5. CSS function injection in string values
 *   6. Overflow: scroll prohibition (defense-in-depth)
 *   7. Color format validation
 *   8. Length format validation
 *   9. Range checks on string length values
 *  10. Border color validation
 *  11. Background gradient stop color validation
 */
function validateSingleStyle(
  style: Record<string, unknown>,
  stylePath: string,
  errors: ValidationError[],
): void {
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

  // borderRadius + directional variants: 0..BORDER_RADIUS_MAX
  for (const prop of [
    'borderRadius',
    'borderRadiusTopLeft',
    'borderRadiusTopRight',
    'borderRadiusBottomLeft',
    'borderRadiusBottomRight',
  ] as const) {
    if (prop in style && isLiteralNumber(style[prop])) {
      const v = style[prop] as number;
      if (v < 0 || v > BORDER_RADIUS_MAX) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `${prop} (${v}) must be between 0 and ${BORDER_RADIUS_MAX} at "${stylePath}.${prop}"`,
            `${stylePath}.${prop}`,
          ),
        );
      }
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

      // Check each shadow's blur/spread/color
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

  // ------------------------------------------------------------------
  // 7. Color format validation
  // ------------------------------------------------------------------
  for (const prop of COLOR_PROPERTIES) {
    if (
      prop in style &&
      isLiteralString(style[prop]) &&
      !isDynamic(style[prop])
    ) {
      if (!isValidColor(style[prop] as string)) {
        errors.push(
          createError(
            'INVALID_COLOR',
            `Invalid color "${style[prop]}" at "${stylePath}.${prop}"`,
            `${stylePath}.${prop}`,
          ),
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // 8. Length format validation
  // ------------------------------------------------------------------
  for (const prop of LENGTH_PROPERTIES) {
    if (
      prop in style &&
      isLiteralString(style[prop]) &&
      !isDynamic(style[prop])
    ) {
      const val = style[prop] as string;
      if (val === 'auto') {
        if (!LENGTH_AUTO_ALLOWED.has(prop)) {
          errors.push(
            createError(
              'INVALID_LENGTH',
              `"auto" is not allowed for "${prop}" at "${stylePath}.${prop}"`,
              `${stylePath}.${prop}`,
            ),
          );
        }
      } else if (!isValidLength(val)) {
        errors.push(
          createError(
            'INVALID_LENGTH',
            `Invalid length "${val}" at "${stylePath}.${prop}"`,
            `${stylePath}.${prop}`,
          ),
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // 9. Range checks on string length values
  // ------------------------------------------------------------------
  for (const [prop, range] of Object.entries(RANGE_LENGTH_PROPERTIES)) {
    if (
      prop in style &&
      isLiteralString(style[prop]) &&
      !isDynamic(style[prop])
    ) {
      const numericValue = parseLengthValue(style[prop] as string);
      if (numericValue !== null) {
        if (numericValue < range.min || numericValue > range.max) {
          errors.push(
            createError(
              'STYLE_VALUE_OUT_OF_RANGE',
              `${prop} (${style[prop]}) must be between ${range.min} and ${range.max} at "${stylePath}.${prop}"`,
              `${stylePath}.${prop}`,
            ),
          );
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 10. Border color validation (border + borderTop/Right/Bottom/Left)
  // ------------------------------------------------------------------
  const borderKeys = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const;
  for (const borderKey of borderKeys) {
    if (
      borderKey in style &&
      typeof style[borderKey] === 'object' &&
      style[borderKey] !== null &&
      !isDynamic(style[borderKey])
    ) {
      const border = style[borderKey] as Record<string, unknown>;
      const borderPath = `${stylePath}.${borderKey}`;

      if (
        isLiteralString(border.color) &&
        !isDynamic(border.color) &&
        !isValidColor(border.color)
      ) {
        errors.push(
          createError(
            'INVALID_COLOR',
            `Invalid color "${border.color}" at "${borderPath}.color"`,
            `${borderPath}.color`,
          ),
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // 11. Background gradient stop color validation
  // ------------------------------------------------------------------
  if (
    'backgroundGradient' in style &&
    typeof style.backgroundGradient === 'object' &&
    style.backgroundGradient !== null &&
    !isDynamic(style.backgroundGradient)
  ) {
    const gradient = style.backgroundGradient as Record<string, unknown>;
    const gradientPath = `${stylePath}.backgroundGradient`;

    if (Array.isArray(gradient.stops)) {
      for (let i = 0; i < gradient.stops.length; i++) {
        const stop = gradient.stops[i];
        if (
          typeof stop === 'object' &&
          stop !== null &&
          !isDynamic(stop)
        ) {
          const stopObj = stop as Record<string, unknown>;
          if (
            isLiteralString(stopObj.color) &&
            !isDynamic(stopObj.color) &&
            !isValidColor(stopObj.color)
          ) {
            errors.push(
              createError(
                'INVALID_COLOR',
                `Invalid color "${stopObj.color}" at "${gradientPath}.stops[${i}].color"`,
                `${gradientPath}.stops[${i}].color`,
              ),
            );
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: merge $style with inline style
// ---------------------------------------------------------------------------

/**
 * Build a merged style object from a card.styles entry and inline style
 * properties, excluding the `$style` key itself from the inline portion.
 */
function mergeStyleWithRef(
  cardStyleEntry: Record<string, unknown>,
  inlineStyle: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...cardStyleEntry };
  for (const [key, value] of Object.entries(inlineStyle)) {
    if (key !== '$style') {
      merged[key] = value;
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Validate all style properties across every node in the card's view tree,
 * and validate card-level style definitions.
 *
 * Checks:
 *   1. Forbidden style properties (spec 3.8)
 *   2. Numeric range limits (spec 6.4)
 *   3. Box-shadow count and value limits
 *   4. Transform skew prohibition
 *   5. CSS function injection in string values
 *   6. Overflow: scroll prohibition (defense-in-depth)
 *   7. Color format validation
 *   8. Length format validation
 *   9. Range checks on string length values
 *  10. $style reference validation and merging
 */
export function validateStyles(
  views: Record<string, unknown>,
  cardStyles?: Record<string, Record<string, unknown>>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // ------------------------------------------------------------------
  // Phase 0: Validate card.styles entries
  // ------------------------------------------------------------------
  if (cardStyles) {
    for (const [styleName, styleEntry] of Object.entries(cardStyles)) {
      const entryPath = `styles.${styleName}`;

      // Defense-in-depth: validate style name format
      // (Zod regex already checks this, but we add a redundant check)
      if (!STYLE_NAME_PATTERN.test(styleName)) {
        errors.push(
          createError(
            'INVALID_STYLE_NAME',
            `Style name "${styleName}" is invalid; must match /^[A-Za-z][A-Za-z0-9_-]*$/ at "${entryPath}"`,
            entryPath,
          ),
        );
      }

      // $style cannot be used inside card.styles definitions (circular ref)
      if ('$style' in styleEntry) {
        errors.push(
          createError(
            'STYLE_CIRCULAR_REF',
            `$style cannot be used inside card.styles definitions at "${entryPath}.$style"`,
            `${entryPath}.$style`,
          ),
        );
      }

      // Run all per-style validations on this entry
      validateSingleStyle(styleEntry, entryPath, errors);
    }
  }

  // ------------------------------------------------------------------
  // Phase 1: Validate per-node styles (with $style merging)
  // ------------------------------------------------------------------
  traverseCard(views, (node: TraversableNode, ctx: TraversalContext) => {
    const style = node.style;
    if (style == null || typeof style !== 'object') {
      return;
    }

    const stylePath = `${ctx.path}.style`;

    // Check for $style reference
    if ('$style' in style && typeof style.$style === 'string') {
      const rawRef = style.$style;
      const trimmedRef = rawRef.trim();

      // Validate $style value format
      if (!STYLE_NAME_PATTERN.test(trimmedRef)) {
        errors.push(
          createError(
            'INVALID_STYLE_REF',
            `$style value "${rawRef}" is invalid; must match /^[A-Za-z][A-Za-z0-9_-]*$/ at "${stylePath}.$style"`,
            `${stylePath}.$style`,
          ),
        );
        return;
      }

      // Check that the referenced style exists
      if (!cardStyles || !(trimmedRef in cardStyles)) {
        errors.push(
          createError(
            'STYLE_REF_NOT_FOUND',
            `$style references "${trimmedRef}" which is not defined in card.styles at "${stylePath}.$style"`,
            `${stylePath}.$style`,
          ),
        );
        return;
      }

      // Merge: card.styles[name] as base, inline styles (minus $style) as overrides
      const mergedStyle = mergeStyleWithRef(cardStyles[trimmedRef], style);

      // Validate the merged result
      validateSingleStyle(mergedStyle, stylePath, errors);
    } else {
      // No $style — validate the inline style directly
      validateSingleStyle(style, stylePath, errors);
    }
  });

  return errors;
}
