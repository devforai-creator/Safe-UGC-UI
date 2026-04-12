/**
 * @safe-ugc-ui/validator — Style Validator
 *
 * Validates style properties according to the spec's style restrictions:
 *   - Forbidden CSS properties (spec 3.8)
 *   - Numeric range limits (spec 6.4)
 *   - Text-shadow count and value limits
 *   - Box-shadow count and value limits
 *   - Transform skew prohibition
 *   - Dangerous CSS function injection detection
 *   - Overflow: scroll prohibition (defense-in-depth)
 *   - Color format validation
 *   - Length format validation
 */

import {
  ASPECT_RATIO_PATTERN,
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
  TEXT_SHADOW_MAX_COUNT,
  TEXT_SHADOW_BLUR_MAX,
  BOX_SHADOW_MAX_COUNT,
  BOX_SHADOW_BLUR_MAX,
  BOX_SHADOW_SPREAD_MAX,
  BORDER_RADIUS_MAX,
  LETTER_SPACING_MIN,
  LETTER_SPACING_MAX,
  OPACITY_MIN,
  OPACITY_MAX,
  BACKDROP_BLUR_MAX,
  CSS_NAMED_COLORS,
  TRANSITION_DURATION_MAX,
  TRANSITION_DELAY_MAX,
  TRANSITION_MAX_COUNT,
  ALLOWED_TRANSITION_PROPERTIES,
  LENGTH_AUTO_STYLE_PROPERTIES,
  RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
  isRef,
  hoverStylePropsSchema,
  responsiveStylePropsSchema,
  stylePropsSchema,
  textSpanStyleSchema,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { walkRenderableCard } from './renderable-walk.js';

// ---------------------------------------------------------------------------
// Property sets
// ---------------------------------------------------------------------------

const COLOR_PROPERTIES = new Set(['backgroundColor', 'color']);

const LENGTH_PROPERTIES = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'top',
  'right',
  'bottom',
  'left',
  'gap',
  'lineHeight',
]);

const LENGTH_AUTO_ALLOWED = new Set<string>(LENGTH_AUTO_STYLE_PROPERTIES);

const RESPONSIVE_OVERRIDE_KEYS = ['medium', 'compact'] as const;
const STYLE_ALLOWED_KEYS = new Set(Object.keys(stylePropsSchema.shape));
const HOVER_STYLE_ALLOWED_KEYS = new Set([
  ...Object.keys(hoverStylePropsSchema.shape),
  'hoverStyle',
]);
const RESPONSIVE_STYLE_ALLOWED_KEYS = new Set([
  ...Object.keys(responsiveStylePropsSchema.shape),
  ...RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
]);
const TEXT_SPAN_STYLE_ALLOWED_KEYS = new Set([
  ...Object.keys(textSpanStyleSchema.shape),
  ...RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
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

interface StyleValidationOptions {
  allowHoverStyle?: boolean;
  allowTransition?: boolean;
  allowHoverStyleRefs?: boolean;
  allowedKeys?: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true only if the value is a literal number (not a $ref).
 */
function isLiteralNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Returns true only if the value is a literal string (not a $ref).
 */
function isLiteralString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Returns true if the value is a dynamic binding ($ref) that should
 * be skipped for static range checks.
 */
function isDynamic(value: unknown): boolean {
  return isRef(value);
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

function isLiteralLength(value: unknown): value is string | number {
  return typeof value === 'number' || typeof value === 'string';
}

function isValidAspectRatioLiteral(value: string | number): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  const match = value.match(ASPECT_RATIO_PATTERN);
  if (!match) {
    return false;
  }

  const parts = value.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const width = Number(parts[0].trim());
  const height = Number(parts[1].trim());
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

/**
 * Recursively scan all string values in a value (which may be a string,
 * object, or array) for dangerous CSS function patterns.
 * Skips $ref objects entirely.
 */
function collectDangerousCssErrors(value: unknown, path: string, errors: ValidationError[]): void {
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

  // Skip $ref objects — they are not user-authored strings
  if (isRef(value)) {
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
  if (isLiteralNumber(shadow.blur) && shadow.blur > BOX_SHADOW_BLUR_MAX) {
    errors.push(
      createError(
        'STYLE_VALUE_OUT_OF_RANGE',
        `boxShadow blur (${shadow.blur}) exceeds maximum of ${BOX_SHADOW_BLUR_MAX} at "${path}.blur"`,
        `${path}.blur`,
      ),
    );
  }

  if (isLiteralNumber(shadow.spread) && shadow.spread > BOX_SHADOW_SPREAD_MAX) {
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

/**
 * Validate a single text-shadow object's blur value and color.
 */
function validateTextShadowObject(
  shadow: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  if (isLiteralNumber(shadow.blur) && shadow.blur > TEXT_SHADOW_BLUR_MAX) {
    errors.push(
      createError(
        'STYLE_VALUE_OUT_OF_RANGE',
        `textShadow blur (${shadow.blur}) exceeds maximum of ${TEXT_SHADOW_BLUR_MAX} at "${path}.blur"`,
        `${path}.blur`,
      ),
    );
  }

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

function validateClipPathLength(value: unknown, path: string, errors: ValidationError[]): void {
  if (value == null || isDynamic(value)) {
    return;
  }

  if (typeof value === 'number') {
    return;
  }

  if (typeof value === 'string' && isValidLength(value)) {
    return;
  }

  errors.push(
    createError('INVALID_LENGTH', `Invalid length "${String(value)}" at "${path}"`, path),
  );
}

function validateClipPathObject(
  clipPath: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  switch (clipPath.type) {
    case 'circle':
      validateClipPathLength(clipPath.radius, `${path}.radius`, errors);
      return;

    case 'ellipse':
      validateClipPathLength(clipPath.rx, `${path}.rx`, errors);
      validateClipPathLength(clipPath.ry, `${path}.ry`, errors);
      return;

    case 'inset':
      validateClipPathLength(clipPath.top, `${path}.top`, errors);
      validateClipPathLength(clipPath.right, `${path}.right`, errors);
      validateClipPathLength(clipPath.bottom, `${path}.bottom`, errors);
      validateClipPathLength(clipPath.left, `${path}.left`, errors);
      validateClipPathLength(clipPath.round, `${path}.round`, errors);
      return;

    default:
      return;
  }
}

// ---------------------------------------------------------------------------
// Regex for valid $style references and style names
// ---------------------------------------------------------------------------

const STYLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function reportStyleRefError(
  rawRef: string,
  stylePath: string,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  errors: ValidationError[],
): string | undefined {
  const trimmedRef = rawRef.trim();

  if (!STYLE_NAME_PATTERN.test(trimmedRef)) {
    errors.push(
      createError(
        'INVALID_STYLE_REF',
        `$style value "${rawRef}" is invalid; must match /^[A-Za-z][A-Za-z0-9_-]*$/ at "${stylePath}.$style"`,
        `${stylePath}.$style`,
      ),
    );
    return undefined;
  }

  if (!cardStyles || !(trimmedRef in cardStyles)) {
    errors.push(
      createError(
        'STYLE_REF_NOT_FOUND',
        `$style references "${trimmedRef}" which is not defined in card.styles at "${stylePath}.$style"`,
        `${stylePath}.$style`,
      ),
    );
    return undefined;
  }

  return trimmedRef;
}

function resolveStyleRef(
  style: Record<string, unknown>,
  stylePath: string,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  errors: ValidationError[],
): Record<string, unknown> | undefined {
  if (typeof style.$style !== 'string') {
    return style;
  }

  const trimmedRef = reportStyleRefError(style.$style, stylePath, cardStyles, errors);
  if (!trimmedRef || !cardStyles) {
    return undefined;
  }

  return mergeStyleWithRef(cardStyles[trimmedRef], style);
}

function collectNestedStyleRefErrors(
  value: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectNestedStyleRefErrors(value[i], `${path}[${i}]`, errors);
    }
    return;
  }

  if (typeof value !== 'object' || value === null) {
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (key === '$style') {
      errors.push(
        createError(
          'STYLE_CIRCULAR_REF',
          `$style cannot be used inside card.styles definitions at "${childPath}"`,
          childPath,
        ),
      );
      continue;
    }
    collectNestedStyleRefErrors(child, childPath, errors);
  }
}

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
 *   4. Text-shadow count and value limits
 *   5. Transform skew prohibition
 *   6. CSS function injection in string values
 *   7. Overflow: scroll prohibition (defense-in-depth)
 *   8. Color format validation
 *   9. Length format validation
 *  10. Range checks on string length values
 *  11. Border color validation
 *  12. Background gradient stop color validation
 */
function validateSingleStyle(
  style: Record<string, unknown>,
  stylePath: string,
  errors: ValidationError[],
  cardStyles?: Record<string, Record<string, unknown>>,
  options: StyleValidationOptions = {},
): void {
  const {
    allowHoverStyle = true,
    allowTransition = true,
    allowHoverStyleRefs = true,
    allowedKeys = STYLE_ALLOWED_KEYS,
  } = options;

  // ------------------------------------------------------------------
  // 1. Forbidden properties (spec 3.8)
  //    Note: 'transition' and 'hoverStyle' are handled as structured
  //    fields (sections 12-13), not raw CSS properties.
  // ------------------------------------------------------------------
  const STRUCTURED_FIELDS = new Set<string>();
  if (allowTransition) STRUCTURED_FIELDS.add('transition');
  if (allowHoverStyle) STRUCTURED_FIELDS.add('hoverStyle');
  for (const key of Object.keys(style)) {
    if (
      !STRUCTURED_FIELDS.has(key) &&
      (FORBIDDEN_STYLE_PROPERTIES as readonly string[]).includes(key)
    ) {
      errors.push(
        createError(
          'FORBIDDEN_STYLE_PROPERTY',
          `Style property "${key}" is forbidden at "${stylePath}.${key}"`,
          `${stylePath}.${key}`,
        ),
      );
      continue;
    }

    if (!allowedKeys.has(key)) {
      errors.push(
        createError(
          'INVALID_VALUE',
          `Unknown style property "${key}" at "${stylePath}.${key}"`,
          `${stylePath}.${key}`,
        ),
      );
    }
  }

  if (!allowHoverStyle && 'hoverStyle' in style) {
    errors.push(
      createError(
        'INVALID_VALUE',
        `hoverStyle is not allowed inside responsive overrides at "${stylePath}.hoverStyle"`,
        `${stylePath}.hoverStyle`,
      ),
    );
  }

  if (!allowTransition && 'transition' in style) {
    errors.push(
      createError(
        'INVALID_VALUE',
        `transition is not allowed inside responsive overrides at "${stylePath}.transition"`,
        `${stylePath}.transition`,
      ),
    );
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

  if ('backdropBlur' in style && isLiteralNumber(style.backdropBlur)) {
    const v = style.backdropBlur;
    if (v < 0 || v > BACKDROP_BLUR_MAX) {
      errors.push(
        createError(
          'STYLE_VALUE_OUT_OF_RANGE',
          `backdropBlur (${v}) must be between 0 and ${BACKDROP_BLUR_MAX} at "${stylePath}.backdropBlur"`,
          `${stylePath}.backdropBlur`,
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
          validateShadowObject(shadow as Record<string, unknown>, `${boxShadowPath}[${i}]`, errors);
        }
      }
    } else if (typeof boxShadow === 'object' && boxShadow !== null) {
      // Single shadow object
      validateShadowObject(boxShadow as Record<string, unknown>, boxShadowPath, errors);
    }
  }

  // ------------------------------------------------------------------
  // 4. Text-shadow limits
  // ------------------------------------------------------------------
  if ('textShadow' in style && style.textShadow != null) {
    const textShadow = style.textShadow;
    const textShadowPath = `${stylePath}.textShadow`;

    if (Array.isArray(textShadow)) {
      if (textShadow.length > TEXT_SHADOW_MAX_COUNT) {
        errors.push(
          createError(
            'STYLE_VALUE_OUT_OF_RANGE',
            `textShadow has ${textShadow.length} entries, maximum is ${TEXT_SHADOW_MAX_COUNT} at "${textShadowPath}"`,
            textShadowPath,
          ),
        );
      }

      for (let i = 0; i < textShadow.length; i++) {
        const shadow = textShadow[i];
        if (typeof shadow === 'object' && shadow !== null) {
          validateTextShadowObject(
            shadow as Record<string, unknown>,
            `${textShadowPath}[${i}]`,
            errors,
          );
        }
      }
    } else if (typeof textShadow === 'object' && textShadow !== null) {
      validateTextShadowObject(textShadow as Record<string, unknown>, textShadowPath, errors);
    }
  }

  // ------------------------------------------------------------------
  // 6. CSS function injection — scan all string values
  // ------------------------------------------------------------------
  for (const [key, value] of Object.entries(style)) {
    collectDangerousCssErrors(value, `${stylePath}.${key}`, errors);
  }

  // ------------------------------------------------------------------
  // 7. Overflow: scroll forbidden (defense-in-depth)
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
  // 8. Color format validation
  // ------------------------------------------------------------------
  for (const prop of COLOR_PROPERTIES) {
    if (prop in style && isLiteralString(style[prop]) && !isDynamic(style[prop])) {
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
  // 9. Length format validation
  // ------------------------------------------------------------------
  for (const prop of LENGTH_PROPERTIES) {
    if (prop in style && isLiteralString(style[prop]) && !isDynamic(style[prop])) {
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

  if ('aspectRatio' in style && style.aspectRatio != null && !isDynamic(style.aspectRatio)) {
    const aspectRatio = style.aspectRatio;
    if (
      (typeof aspectRatio !== 'number' && typeof aspectRatio !== 'string') ||
      !isValidAspectRatioLiteral(aspectRatio)
    ) {
      errors.push(
        createError(
          'INVALID_VALUE',
          `Invalid aspectRatio "${String(aspectRatio)}" at "${stylePath}.aspectRatio"`,
          `${stylePath}.aspectRatio`,
        ),
      );
    }
  }

  if (
    'clipPath' in style &&
    style.clipPath != null &&
    typeof style.clipPath === 'object' &&
    !Array.isArray(style.clipPath) &&
    !isDynamic(style.clipPath)
  ) {
    validateClipPathObject(
      style.clipPath as Record<string, unknown>,
      `${stylePath}.clipPath`,
      errors,
    );
  }

  // ------------------------------------------------------------------
  // 10. Range checks on string length values
  // ------------------------------------------------------------------
  for (const [prop, range] of Object.entries(RANGE_LENGTH_PROPERTIES)) {
    if (prop in style && isLiteralString(style[prop]) && !isDynamic(style[prop])) {
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
  // 11. Border color validation (border + borderTop/Right/Bottom/Left)
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
  // 12. Background gradient stop color validation
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
        if (typeof stop === 'object' && stop !== null && !isDynamic(stop)) {
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

  // ------------------------------------------------------------------
  // 13. hoverStyle validation (spec 3.9)
  // ------------------------------------------------------------------
  if (allowHoverStyle && 'hoverStyle' in style && style.hoverStyle != null) {
    const hoverStyle = style.hoverStyle;
    const hoverPath = `${stylePath}.hoverStyle`;

    if (typeof hoverStyle !== 'object' || Array.isArray(hoverStyle)) {
      errors.push(
        createError(
          'INVALID_HOVER_STYLE',
          `hoverStyle must be an object at "${hoverPath}"`,
          hoverPath,
        ),
      );
    } else {
      const hoverObj = hoverStyle as Record<string, unknown>;

      // Nested hoverStyle is forbidden
      if ('hoverStyle' in hoverObj) {
        errors.push(
          createError(
            'HOVER_STYLE_NESTED',
            `Nested hoverStyle is forbidden at "${hoverPath}.hoverStyle"`,
            `${hoverPath}.hoverStyle`,
          ),
        );
      }

      const mergedHoverStyle = allowHoverStyleRefs
        ? resolveStyleRef(hoverObj, hoverPath, cardStyles, errors)
        : hoverObj;

      if (mergedHoverStyle) {
        // Validate hoverStyle with the same rules (recursive call)
        validateSingleStyle(mergedHoverStyle, hoverPath, errors, cardStyles, {
          allowHoverStyle,
          allowTransition,
          allowHoverStyleRefs,
          allowedKeys: HOVER_STYLE_ALLOWED_KEYS,
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // 14. transition validation (spec 3.9)
  // ------------------------------------------------------------------
  if (allowTransition && 'transition' in style && style.transition != null) {
    const transition = style.transition;
    const transPath = `${stylePath}.transition`;

    // Defense-in-depth: reject raw string transitions
    if (typeof transition === 'string') {
      errors.push(
        createError(
          'TRANSITION_RAW_STRING',
          `transition must be an object or array, not a string at "${transPath}"`,
          transPath,
        ),
      );
    } else {
      const transitions = Array.isArray(transition) ? transition : [transition];

      if (transitions.length > TRANSITION_MAX_COUNT) {
        errors.push(
          createError(
            'TRANSITION_COUNT_EXCEEDED',
            `transition has ${transitions.length} entries, maximum is ${TRANSITION_MAX_COUNT} at "${transPath}"`,
            transPath,
          ),
        );
      }

      for (let i = 0; i < transitions.length; i++) {
        const t = transitions[i];
        const tPath = Array.isArray(transition) ? `${transPath}[${i}]` : transPath;

        if (typeof t !== 'object' || t === null) continue;
        const tObj = t as Record<string, unknown>;

        // Validate property is in whitelist
        if (
          isLiteralString(tObj.property) &&
          !(ALLOWED_TRANSITION_PROPERTIES as readonly string[]).includes(tObj.property)
        ) {
          errors.push(
            createError(
              'TRANSITION_PROPERTY_FORBIDDEN',
              `transition property "${tObj.property}" is not in the allowed list at "${tPath}.property"`,
              `${tPath}.property`,
            ),
          );
        }

        // Validate duration range
        if (isLiteralNumber(tObj.duration)) {
          if (tObj.duration < 0 || tObj.duration > TRANSITION_DURATION_MAX) {
            errors.push(
              createError(
                'STYLE_VALUE_OUT_OF_RANGE',
                `transition duration (${tObj.duration}) must be between 0 and ${TRANSITION_DURATION_MAX} at "${tPath}.duration"`,
                `${tPath}.duration`,
              ),
            );
          }
        }

        // Validate delay range
        if (isLiteralNumber(tObj.delay)) {
          if (tObj.delay < 0 || tObj.delay > TRANSITION_DELAY_MAX) {
            errors.push(
              createError(
                'STYLE_VALUE_OUT_OF_RANGE',
                `transition delay (${tObj.delay}) must be between 0 and ${TRANSITION_DELAY_MAX} at "${tPath}.delay"`,
                `${tPath}.delay`,
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
  fragments?: Record<string, unknown>,
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

      // $style cannot be used anywhere inside card.styles definitions
      collectNestedStyleRefErrors(styleEntry, entryPath, errors);

      // Run all per-style validations on this entry
      validateSingleStyle(styleEntry, entryPath, errors, undefined, {
        allowHoverStyleRefs: false,
        allowedKeys: STYLE_ALLOWED_KEYS,
      });
    }
  }

  // ------------------------------------------------------------------
  // Phase 1: Validate per-node styles (with $style merging)
  // ------------------------------------------------------------------
  walkRenderableCard(views, fragments, (node, ctx) => {
    if (!('type' in node) || typeof node.type !== 'string') {
      return;
    }

    const style =
      node.style != null && typeof node.style === 'object' && !Array.isArray(node.style)
        ? (node.style as Record<string, unknown>)
        : undefined;
    if (style != null && typeof style === 'object') {
      const stylePath = `${ctx.path}.style`;

      const mergedStyle = resolveStyleRef(style, stylePath, cardStyles, errors);
      if (mergedStyle) {
        // No $style or valid $style — validate the effective style
        validateSingleStyle(mergedStyle, stylePath, errors, cardStyles);
      }
    }

    const responsive = node.responsive;
    if (responsive != null && typeof responsive === 'object' && !Array.isArray(responsive)) {
      for (const mode of RESPONSIVE_OVERRIDE_KEYS) {
        const override = (responsive as Record<string, unknown>)[mode];
        if (override != null && typeof override === 'object' && !Array.isArray(override)) {
          const overridePath = `${ctx.path}.responsive.${mode}`;
          const mergedOverride = resolveStyleRef(
            override as Record<string, unknown>,
            overridePath,
            cardStyles,
            errors,
          );

          if (mergedOverride) {
            validateSingleStyle(mergedOverride, overridePath, errors, cardStyles, {
              allowHoverStyle: false,
              allowTransition: false,
              allowHoverStyleRefs: false,
              allowedKeys: RESPONSIVE_STYLE_ALLOWED_KEYS,
            });
          }
        }
      }
    }

    const spans = Array.isArray(node.spans) ? node.spans : undefined;
    if (node.type === 'Text' && spans) {
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        if (span == null || typeof span !== 'object' || Array.isArray(span)) {
          continue;
        }

        const spanStyle = (span as Record<string, unknown>).style;
        if (spanStyle == null || typeof spanStyle !== 'object' || Array.isArray(spanStyle)) {
          continue;
        }

        validateSingleStyle(
          spanStyle as Record<string, unknown>,
          `${ctx.path}.spans[${i}].style`,
          errors,
          undefined,
          {
            allowHoverStyle: false,
            allowTransition: false,
            allowHoverStyleRefs: false,
            allowedKeys: TEXT_SPAN_STYLE_ALLOWED_KEYS,
          },
        );
      }
    }
  });

  return errors;
}
