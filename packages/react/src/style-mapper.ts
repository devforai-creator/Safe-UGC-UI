/**
 * @safe-ugc-ui/react — Style Mapper
 *
 * Maps StyleProps objects from the UGC card schema to React CSSProperties.
 * Uses a whitelist approach: only recognized style properties are mapped.
 *
 * Handles special cases:
 *   - border / borderTop/Right/Bottom/Left objects -> CSS shorthand strings
 *   - transform object -> CSS transform string
 *   - boxShadow object(s) -> CSS box-shadow string
 *   - textShadow object(s) -> CSS text-shadow string
 *   - backgroundGradient object -> CSS background string
 *   - fontFamily token -> CSS font-family stack
 *   - Dynamic values ($ref) are resolved via state-resolver
 */

import type { CSSProperties } from 'react';
import {
  ALLOWED_TRANSITION_PROPERTIES,
  BACKDROP_BLUR_MAX,
  BORDER_RADIUS_MAX,
  BOX_SHADOW_BLUR_MAX,
  BOX_SHADOW_SPREAD_MAX,
  CSS_NAMED_COLORS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LETTER_SPACING_MAX,
  LETTER_SPACING_MIN,
  OPACITY_MAX,
  OPACITY_MIN,
  TEXT_SHADOW_BLUR_MAX,
  TRANSFORM_SCALE_MAX,
  TRANSFORM_SCALE_MIN,
  TRANSFORM_TRANSLATE_MAX,
  TRANSFORM_TRANSLATE_MIN,
  TRANSITION_DELAY_MAX,
  TRANSITION_DURATION_MAX,
  ZINDEX_MAX,
  ZINDEX_MIN,
} from '@safe-ugc-ui/types';
import { resolveValue } from './state-resolver.js';

// ---------------------------------------------------------------------------
// Whitelist of style properties that map directly to CSS
// ---------------------------------------------------------------------------

const DIRECT_MAP_PROPS = [
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'alignSelf',
  'flexWrap', 'flex', 'gap', 'width', 'height', 'aspectRatio', 'minWidth', 'maxWidth',
  'minHeight', 'maxHeight', 'padding', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'margin', 'marginTop', 'marginRight',
  'marginBottom', 'marginLeft', 'backgroundColor', 'color', 'borderRadius',
  'borderRadiusTopLeft', 'borderRadiusTopRight',
  'borderRadiusBottomLeft', 'borderRadiusBottomRight',
  'fontSize', 'fontWeight', 'fontStyle', 'textAlign', 'textDecoration',
  'lineHeight', 'letterSpacing', 'opacity', 'overflow', 'position',
  'top', 'right', 'bottom', 'left', 'zIndex',
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
  'objectFit', 'objectPosition',
] as const;

const FONT_FAMILY_STACKS: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  rounded: '"SF Pro Rounded", ui-rounded, "Hiragino Maru Gothic ProN", "Nunito", system-ui, sans-serif',
  display: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
  handwriting: '"Bradley Hand", "Segoe Print", "Comic Sans MS", "Marker Felt", cursive',
};

const DISPLAY_VALUES = new Set(['flex', 'block', 'none']);
const FLEX_DIRECTION_VALUES = new Set(['row', 'column', 'row-reverse', 'column-reverse']);
const JUSTIFY_CONTENT_VALUES = new Set([
  'start',
  'flex-start',
  'center',
  'end',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
]);
const ALIGN_ITEMS_VALUES = new Set([
  'start',
  'flex-start',
  'center',
  'end',
  'flex-end',
  'stretch',
  'baseline',
]);
const ALIGN_SELF_VALUES = new Set([
  'auto',
  'start',
  'flex-start',
  'center',
  'end',
  'flex-end',
  'stretch',
]);
const FLEX_WRAP_VALUES = new Set(['nowrap', 'wrap', 'wrap-reverse']);
const TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);
const TEXT_DECORATION_VALUES = new Set(['none', 'underline', 'line-through']);
const FONT_STYLE_VALUES = new Set(['normal', 'italic']);
const OBJECT_FIT_VALUES = new Set(['cover', 'contain', 'fill', 'none', 'scale-down']);
const OVERFLOW_VALUES = new Set(['visible', 'hidden', 'auto']);
const POSITION_VALUES = new Set(['static', 'relative', 'absolute']);
const FONT_WEIGHT_STRING_VALUES = new Set([
  'normal',
  'bold',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]);
const FONT_WEIGHT_NUMBER_VALUES = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);
const LENGTH_AUTO_ALLOWED = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
]);
const LENGTH_PATTERN = /^-?[0-9]+(\.[0-9]+)?(px|%|em|rem)?$/;

// ---------------------------------------------------------------------------
// Forbidden CSS functions (defense-in-depth)
// ---------------------------------------------------------------------------

const FORBIDDEN_CSS_FUNCTIONS_LOWER = ['url(', 'var(', 'calc(', 'env(', 'expression('];

function containsForbiddenCssFunction(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_CSS_FUNCTIONS_LOWER.some(fn => lower.includes(fn));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLengthString(value: string): boolean {
  return LENGTH_PATTERN.test(value);
}

function parseLengthValue(value: string): number | null {
  const match = value.match(/^(-?[0-9]+(\.[0-9]+)?)(px|%|em|rem)?$/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function isValidColor(value: string): boolean {
  const lower = value.toLowerCase();

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(lower)) {
    return true;
  }

  if (
    lower.startsWith('rgb(') ||
    lower.startsWith('rgba(') ||
    lower.startsWith('hsl(') ||
    lower.startsWith('hsla(')
  ) {
    return true;
  }

  if (CSS_NAMED_COLORS.has(lower)) {
    return true;
  }

  return lower === 'transparent' || lower === 'currentcolor';
}

function isValidAspectRatio(value: unknown): value is string | number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value !== 'string' || containsForbiddenCssFunction(value)) {
    return false;
  }

  const match = value.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*$/);
  if (!match) {
    return false;
  }

  return Number(match[1]) > 0 && Number(match[2]) > 0;
}

// ---------------------------------------------------------------------------
// Helper: resolve a style value (may be literal or $ref)
// ---------------------------------------------------------------------------

function resolveStyleValue(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): unknown {
  return resolveValue(value, state, locals);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface NumberRangeOptions {
  min?: number;
  max?: number;
}

function resolveStructuredNumber(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
  range?: NumberRangeOptions,
): number | undefined {
  const resolved = resolveStyleValue(value, state, locals);
  if (!isFiniteNumber(resolved)) {
    return undefined;
  }

  if (
    (range?.min !== undefined && resolved < range.min) ||
    (range?.max !== undefined && resolved > range.max)
  ) {
    return undefined;
  }

  return resolved;
}

function resolveStructuredString(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string | undefined {
  const resolved = resolveStyleValue(value, state, locals);
  if (typeof resolved !== 'string') {
    return undefined;
  }
  if (containsForbiddenCssFunction(resolved)) {
    return undefined;
  }
  return resolved;
}

function resolveStructuredColor(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string | undefined {
  const resolved = resolveStructuredString(value, state, locals);
  if (resolved === undefined || !isValidColor(resolved)) {
    return undefined;
  }

  return resolved;
}

function resolveStructuredLength(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string | number | undefined {
  const resolved = resolveStyleValue(value, state, locals);
  if (isFiniteNumber(resolved)) {
    return resolved;
  }

  if (
    typeof resolved === 'string' &&
    !containsForbiddenCssFunction(resolved) &&
    isValidLengthString(resolved)
  ) {
    return resolved;
  }

  return undefined;
}

function resolveDirectLengthValue(
  prop: typeof DIRECT_MAP_PROPS[number],
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
  range?: NumberRangeOptions,
): string | number | undefined {
  const resolved = resolveStyleValue(value, state, locals);

  if (isFiniteNumber(resolved)) {
    if (
      (range?.min !== undefined && resolved < range.min) ||
      (range?.max !== undefined && resolved > range.max)
    ) {
      return undefined;
    }

    return resolved;
  }

  if (typeof resolved !== 'string' || containsForbiddenCssFunction(resolved)) {
    return undefined;
  }

  if (resolved === 'auto') {
    return LENGTH_AUTO_ALLOWED.has(prop) ? resolved : undefined;
  }

  if (!isValidLengthString(resolved)) {
    return undefined;
  }

  const numericValue = parseLengthValue(resolved);
  if (
    numericValue !== null &&
    (
      (range?.min !== undefined && numericValue < range.min) ||
      (range?.max !== undefined && numericValue > range.max)
    )
  ) {
    return undefined;
  }

  return resolved;
}

function resolveLineHeightValue(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string | number | undefined {
  const resolved = resolveStyleValue(value, state, locals);

  if (isFiniteNumber(resolved)) {
    return resolved;
  }

  if (typeof resolved !== 'string' || containsForbiddenCssFunction(resolved)) {
    return undefined;
  }

  return isValidLengthString(resolved) ? resolved : undefined;
}

function resolveAllowedStringValue(
  value: unknown,
  state: Record<string, unknown>,
  locals: Record<string, unknown> | undefined,
  allowed: ReadonlySet<string>,
): string | undefined {
  const resolved = resolveStructuredString(value, state, locals);
  if (resolved === undefined || !allowed.has(resolved)) {
    return undefined;
  }

  return resolved;
}

function resolveDirectMappedPropValue(
  prop: typeof DIRECT_MAP_PROPS[number],
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): unknown {
  switch (prop) {
    case 'display':
      return resolveAllowedStringValue(value, state, locals, DISPLAY_VALUES);
    case 'flexDirection':
      return resolveAllowedStringValue(value, state, locals, FLEX_DIRECTION_VALUES);
    case 'justifyContent':
      return resolveAllowedStringValue(value, state, locals, JUSTIFY_CONTENT_VALUES);
    case 'alignItems':
      return resolveAllowedStringValue(value, state, locals, ALIGN_ITEMS_VALUES);
    case 'alignSelf':
      return resolveAllowedStringValue(value, state, locals, ALIGN_SELF_VALUES);
    case 'flexWrap':
      return resolveAllowedStringValue(value, state, locals, FLEX_WRAP_VALUES);
    case 'textAlign':
      return resolveAllowedStringValue(value, state, locals, TEXT_ALIGN_VALUES);
    case 'textDecoration':
      return resolveAllowedStringValue(value, state, locals, TEXT_DECORATION_VALUES);
    case 'fontStyle':
      return resolveAllowedStringValue(value, state, locals, FONT_STYLE_VALUES);
    case 'objectFit':
      return resolveAllowedStringValue(value, state, locals, OBJECT_FIT_VALUES);
    case 'overflow':
      return resolveAllowedStringValue(value, state, locals, OVERFLOW_VALUES);
    case 'position':
      return resolveAllowedStringValue(value, state, locals, POSITION_VALUES);
    case 'flex':
      return resolveStructuredNumber(value, state, locals);
    case 'gap':
    case 'width':
    case 'height':
    case 'minWidth':
    case 'maxWidth':
    case 'minHeight':
    case 'maxHeight':
    case 'padding':
    case 'paddingTop':
    case 'paddingRight':
    case 'paddingBottom':
    case 'paddingLeft':
    case 'margin':
    case 'marginTop':
    case 'marginRight':
    case 'marginBottom':
    case 'marginLeft':
    case 'top':
    case 'right':
    case 'bottom':
    case 'left':
      return resolveDirectLengthValue(prop, value, state, locals);
    case 'backgroundColor':
    case 'color':
      return resolveStructuredColor(value, state, locals);
    case 'borderRadius':
    case 'borderRadiusTopLeft':
    case 'borderRadiusTopRight':
    case 'borderRadiusBottomLeft':
    case 'borderRadiusBottomRight':
      return resolveDirectLengthValue(
        prop,
        value,
        state,
        locals,
        { min: 0, max: BORDER_RADIUS_MAX },
      );
    case 'fontSize':
      return resolveDirectLengthValue(
        prop,
        value,
        state,
        locals,
        { min: FONT_SIZE_MIN, max: FONT_SIZE_MAX },
      );
    case 'fontWeight': {
      const resolved = resolveStyleValue(value, state, locals);
      if (
        typeof resolved === 'string' &&
        !containsForbiddenCssFunction(resolved) &&
        FONT_WEIGHT_STRING_VALUES.has(resolved)
      ) {
        return resolved;
      }
      if (typeof resolved === 'number' && FONT_WEIGHT_NUMBER_VALUES.has(resolved)) {
        return resolved;
      }
      return undefined;
    }
    case 'lineHeight':
      return resolveLineHeightValue(value, state, locals);
    case 'letterSpacing':
      return resolveDirectLengthValue(
        prop,
        value,
        state,
        locals,
        { min: LETTER_SPACING_MIN, max: LETTER_SPACING_MAX },
      );
    case 'opacity':
      return resolveStructuredNumber(
        value,
        state,
        locals,
        { min: OPACITY_MIN, max: OPACITY_MAX },
      );
    case 'zIndex':
      return resolveStructuredNumber(
        value,
        state,
        locals,
        { min: ZINDEX_MIN, max: ZINDEX_MAX },
      );
    case 'gridTemplateColumns':
    case 'gridTemplateRows':
    case 'gridColumn':
    case 'gridRow':
    case 'objectPosition':
      return resolveStructuredString(value, state, locals);
    case 'aspectRatio': {
      const resolved = resolveStyleValue(value, state, locals);
      return isValidAspectRatio(resolved) ? resolved : undefined;
    }
    default:
      return undefined;
  }
}

function toCssLength(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}

// ---------------------------------------------------------------------------
// Helper: transform object -> CSS transform string
// ---------------------------------------------------------------------------

function transformToCss(transform: Record<string, unknown>): string {
  const parts: string[] = [];

  if (transform.rotate !== undefined) {
    parts.push(`rotate(${String(transform.rotate)})`);
  }
  if (transform.scale !== undefined) {
    parts.push(`scale(${String(transform.scale)})`);
  }
  if (transform.translateX !== undefined) {
    parts.push(`translateX(${String(transform.translateX)}px)`);
  }
  if (transform.translateY !== undefined) {
    parts.push(`translateY(${String(transform.translateY)}px)`);
  }

  return parts.join(' ');
}

function resolveTransformObject(
  transform: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!isRecord(transform)) {
    return undefined;
  }

  const resolved: Record<string, unknown> = {};
  const rotate = resolveStructuredString(transform.rotate, state, locals);
  const scale = resolveStructuredNumber(
    transform.scale,
    state,
    locals,
    { min: TRANSFORM_SCALE_MIN, max: TRANSFORM_SCALE_MAX },
  );
  const translateX = resolveStructuredNumber(
    transform.translateX,
    state,
    locals,
    { min: TRANSFORM_TRANSLATE_MIN, max: TRANSFORM_TRANSLATE_MAX },
  );
  const translateY = resolveStructuredNumber(
    transform.translateY,
    state,
    locals,
    { min: TRANSFORM_TRANSLATE_MIN, max: TRANSFORM_TRANSLATE_MAX },
  );

  if (rotate !== undefined) resolved.rotate = rotate;
  if (scale !== undefined) resolved.scale = scale;
  if (translateX !== undefined) resolved.translateX = translateX;
  if (translateY !== undefined) resolved.translateY = translateY;

  return resolved;
}

// ---------------------------------------------------------------------------
// Helper: shadow object(s) -> CSS box-shadow string
// ---------------------------------------------------------------------------

function singleShadowToCss(shadow: Record<string, unknown>): string {
  const offsetX = shadow.offsetX ?? 0;
  const offsetY = shadow.offsetY ?? 0;
  const blur = shadow.blur ?? 0;
  const spread = shadow.spread ?? 0;
  const color = shadow.color ?? '#000';
  return `${String(offsetX)}px ${String(offsetY)}px ${String(blur)}px ${String(spread)}px ${String(color)}`;
}

function resolveShadowObject(
  shadow: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!isRecord(shadow)) {
    return undefined;
  }

  const resolved: Record<string, unknown> = {};
  const offsetX = resolveStructuredNumber(shadow.offsetX, state, locals);
  const offsetY = resolveStructuredNumber(shadow.offsetY, state, locals);
  const blur = resolveStructuredNumber(
    shadow.blur,
    state,
    locals,
    { min: 0, max: BOX_SHADOW_BLUR_MAX },
  );
  const spread = resolveStructuredNumber(
    shadow.spread,
    state,
    locals,
    { min: 0, max: BOX_SHADOW_SPREAD_MAX },
  );
  const color = resolveStructuredColor(shadow.color, state, locals);

  if (offsetX !== undefined) resolved.offsetX = offsetX;
  if (offsetY !== undefined) resolved.offsetY = offsetY;
  if (blur !== undefined) resolved.blur = blur;
  if (spread !== undefined) resolved.spread = spread;
  if (color !== undefined) resolved.color = color;

  return resolved;
}

function shadowToCss(shadow: unknown): string {
  if (Array.isArray(shadow)) {
    return shadow
      .map((s) => singleShadowToCss(s as Record<string, unknown>))
      .join(', ');
  }
  if (typeof shadow === 'object' && shadow !== null) {
    return singleShadowToCss(shadow as Record<string, unknown>);
  }
  return '';
}

function resolveBoxShadowValue(
  shadow: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): unknown {
  if (Array.isArray(shadow)) {
    return shadow
      .map((item) => resolveShadowObject(item, state, locals))
      .filter((item): item is Record<string, unknown> => item !== undefined);
  }

  return resolveShadowObject(shadow, state, locals);
}

// ---------------------------------------------------------------------------
// Helper: text shadow object(s) -> CSS text-shadow string
// ---------------------------------------------------------------------------

function singleTextShadowToCss(shadow: Record<string, unknown>): string {
  const offsetX = shadow.offsetX ?? 0;
  const offsetY = shadow.offsetY ?? 0;
  const blur = shadow.blur ?? 0;
  const color = shadow.color ?? '#000';
  return `${String(offsetX)}px ${String(offsetY)}px ${String(blur)}px ${String(color)}`;
}

function resolveTextShadowObject(
  shadow: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!isRecord(shadow)) {
    return undefined;
  }

  const resolved: Record<string, unknown> = {};
  const offsetX = resolveStructuredNumber(shadow.offsetX, state, locals);
  const offsetY = resolveStructuredNumber(shadow.offsetY, state, locals);
  const blur = resolveStructuredNumber(
    shadow.blur,
    state,
    locals,
    { min: 0, max: TEXT_SHADOW_BLUR_MAX },
  );
  const color = resolveStructuredColor(shadow.color, state, locals);

  if (offsetX !== undefined) resolved.offsetX = offsetX;
  if (offsetY !== undefined) resolved.offsetY = offsetY;
  if (blur !== undefined) resolved.blur = blur;
  if (color !== undefined) resolved.color = color;

  return resolved;
}

function textShadowToCss(shadow: unknown): string {
  if (Array.isArray(shadow)) {
    return shadow
      .map((s) => singleTextShadowToCss(s as Record<string, unknown>))
      .join(', ');
  }
  if (typeof shadow === 'object' && shadow !== null) {
    return singleTextShadowToCss(shadow as Record<string, unknown>);
  }
  return '';
}

function resolveTextShadowValue(
  shadow: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): unknown {
  if (Array.isArray(shadow)) {
    return shadow
      .map((item) => resolveTextShadowObject(item, state, locals))
      .filter((item): item is Record<string, unknown> => item !== undefined);
  }

  return resolveTextShadowObject(shadow, state, locals);
}

// ---------------------------------------------------------------------------
// Helper: gradient object -> CSS background string
// ---------------------------------------------------------------------------

function gradientToCss(gradient: Record<string, unknown>): string {
  const stops = gradient.stops as Array<{ color: string; position: string }> | undefined;
  if (!stops || !Array.isArray(stops)) return '';

  const stopsStr = stops
    .map((s) => `${s.color} ${s.position}`)
    .join(', ');

  if (gradient.type === 'radial') {
    return `radial-gradient(circle, ${stopsStr})`;
  }

  if (gradient.type === 'repeating-linear') {
    const direction = (gradient.direction as string) ?? '180deg';
    return `repeating-linear-gradient(${direction}, ${stopsStr})`;
  }

  // Default to linear
  const direction = (gradient.direction as string) ?? '180deg';
  return `linear-gradient(${direction}, ${stopsStr})`;
}

function resolveGradientStop(
  stop: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): { color: string; position: string } | undefined {
  if (!isRecord(stop)) {
    return undefined;
  }

  const color = resolveStructuredColor(stop.color, state, locals);
  const position = resolveStructuredString(stop.position, state, locals);
  if (color === undefined || position === undefined) {
    return undefined;
  }

  return { color, position };
}

function resolveGradientObject(
  gradient: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!isRecord(gradient) || !Array.isArray(gradient.stops)) {
    return undefined;
  }

  const resolvedStops = gradient.stops
    .map((stop) => resolveGradientStop(stop, state, locals))
    .filter((stop): stop is { color: string; position: string } => stop !== undefined);

  if (resolvedStops.length === 0) {
    return undefined;
  }

  const resolved: Record<string, unknown> = {
    type: gradient.type,
    stops: resolvedStops,
  };

  const direction = resolveStructuredString(gradient.direction, state, locals);
  if (direction !== undefined) {
    resolved.direction = direction;
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Helper: border object -> CSS border shorthand string
// ---------------------------------------------------------------------------

function borderToCss(border: Record<string, unknown>): string {
  const width = border.width ?? 0;
  const style = border.style ?? 'solid';
  const color = border.color ?? '#000';
  return `${String(width)}px ${String(style)} ${String(color)}`;
}

const BORDER_STYLE_VALUES = new Set(['solid', 'dashed', 'dotted', 'none']);

function resolveBorderObject(
  border: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!isRecord(border)) {
    return undefined;
  }

  const resolved: Record<string, unknown> = {};
  const width = resolveStructuredNumber(border.width, state, locals);
  const style = resolveStructuredString(border.style, state, locals);
  const color = resolveStructuredColor(border.color, state, locals);

  if (width !== undefined) resolved.width = width;
  if (style !== undefined && BORDER_STYLE_VALUES.has(style)) resolved.style = style;
  if (color !== undefined) resolved.color = color;

  return resolved;
}

function clipPathToCss(clipPath: Record<string, unknown>): string {
  switch (clipPath.type) {
    case 'circle':
      return `circle(${toCssLength(clipPath.radius as string | number)})`;

    case 'ellipse':
      return `ellipse(${toCssLength(clipPath.rx as string | number)} ${toCssLength(clipPath.ry as string | number)})`;

    case 'inset': {
      const base = [
        toCssLength(clipPath.top as string | number),
        toCssLength(clipPath.right as string | number),
        toCssLength(clipPath.bottom as string | number),
        toCssLength(clipPath.left as string | number),
      ].join(' ');

      const round = clipPath.round;
      return round !== undefined
        ? `inset(${base} round ${toCssLength(round as string | number)})`
        : `inset(${base})`;
    }

    default:
      return '';
  }
}

function resolveClipPathObject(
  clipPath: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!isRecord(clipPath) || typeof clipPath.type !== 'string') {
    return undefined;
  }

  switch (clipPath.type) {
    case 'circle': {
      const radius = resolveStructuredLength(clipPath.radius, state, locals);
      return radius !== undefined ? { type: 'circle', radius } : undefined;
    }

    case 'ellipse': {
      const rx = resolveStructuredLength(clipPath.rx, state, locals);
      const ry = resolveStructuredLength(clipPath.ry, state, locals);
      return rx !== undefined && ry !== undefined
        ? { type: 'ellipse', rx, ry }
        : undefined;
    }

    case 'inset': {
      const top = resolveStructuredLength(clipPath.top, state, locals);
      const right = resolveStructuredLength(clipPath.right, state, locals);
      const bottom = resolveStructuredLength(clipPath.bottom, state, locals);
      const left = resolveStructuredLength(clipPath.left, state, locals);
      const round = resolveStructuredLength(clipPath.round, state, locals);

      if (
        top === undefined ||
        right === undefined ||
        bottom === undefined ||
        left === undefined
      ) {
        return undefined;
      }

      return {
        type: 'inset',
        top,
        right,
        bottom,
        left,
        ...(round !== undefined ? { round } : {}),
      };
    }

    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Helper: map spec alignment values to CSS flexbox values
// ---------------------------------------------------------------------------

const FLEX_ALIGNMENT_MAP: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
};

const FLEX_ALIGNMENT_PROPS = new Set([
  'justifyContent',
  'alignItems',
  'alignSelf',
]);

// ---------------------------------------------------------------------------
// Main: mapStyle
// ---------------------------------------------------------------------------

/**
 * Convert a UGC StyleProps object to React CSSProperties.
 *
 * @param style - The style object from a UGC node (may contain $ref values)
 * @param state - The card state for resolving $ref values
 * @param locals - Optional local variables for resolving $ref values (checked before state)
 * @returns A React CSSProperties object
 */
export function mapStyle(
  style: Record<string, unknown> | undefined,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): CSSProperties {
  if (!style) return {};

  const css: CSSProperties = {};

  // Direct-mapped properties (resolve dynamic values)
  for (const prop of DIRECT_MAP_PROPS) {
    if (prop in style) {
      let resolved = resolveDirectMappedPropValue(prop, style[prop], state, locals);
      if (resolved !== undefined) {
        // Map spec alignment values (start/end) to CSS flexbox values
        if (
          FLEX_ALIGNMENT_PROPS.has(prop) &&
          typeof resolved === 'string' &&
          resolved in FLEX_ALIGNMENT_MAP
        ) {
          resolved = FLEX_ALIGNMENT_MAP[resolved];
        }
        // Block forbidden CSS functions (defense-in-depth)
        if (typeof resolved === 'string' && containsForbiddenCssFunction(resolved)) {
          continue;
        }
        if (prop === 'aspectRatio' && !isValidAspectRatio(resolved)) {
          continue;
        }
        (css as Record<string, unknown>)[prop] = resolved;
      }
    }
  }

  const fontFamilyToken = resolveStructuredString(style.fontFamily, state, locals);
  if (fontFamilyToken && fontFamilyToken in FONT_FAMILY_STACKS) {
    css.fontFamily = FONT_FAMILY_STACKS[fontFamilyToken];
  }

  // Transform object -> CSS transform string
  const resolvedTransform = resolveTransformObject(style.transform, state, locals);
  if (resolvedTransform) {
    const transformCss = transformToCss(resolvedTransform);
    if (transformCss) {
      css.transform = transformCss;
    }
  }

  // Border shorthand
  const resolvedBorder = resolveBorderObject(style.border, state, locals);
  if (resolvedBorder) {
    css.border = borderToCss(resolvedBorder);
  }

  // Border sides (borderTop, borderRight, borderBottom, borderLeft)
  for (const side of ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const) {
    const resolvedSide = resolveBorderObject(style[side], state, locals);
    if (resolvedSide) {
      (css as Record<string, unknown>)[side] = borderToCss(resolvedSide);
    }
  }

  // Box shadow
  if (style.boxShadow) {
    const resolvedShadow = resolveBoxShadowValue(style.boxShadow, state, locals);
    const shadowCss = shadowToCss(resolvedShadow);
    if (shadowCss) {
      css.boxShadow = shadowCss;
    }
  }

  // Text shadow
  if (style.textShadow) {
    const resolvedShadow = resolveTextShadowValue(style.textShadow, state, locals);
    const shadowCss = textShadowToCss(resolvedShadow);
    if (shadowCss) {
      css.textShadow = shadowCss;
    }
  }

  // Background gradient -> CSS background
  const resolvedGradient = resolveGradientObject(style.backgroundGradient, state, locals);
  if (resolvedGradient) {
    const backgroundCss = gradientToCss(resolvedGradient);
    if (backgroundCss) {
      css.background = backgroundCss;
    }
  }

  // Transition object(s) -> CSS transition string
  if (style.transition) {
    const transitionCss = mapTransition(style.transition);
    if (transitionCss) {
      css.transition = transitionCss;
    }
  }

  const resolvedBackdropBlur = resolveStructuredNumber(
    style.backdropBlur,
    state,
    locals,
    { min: 0, max: BACKDROP_BLUR_MAX },
  );
  if (resolvedBackdropBlur !== undefined) {
    (css as Record<string, unknown>).backdropFilter = `blur(${resolvedBackdropBlur}px)`;
  }

  const resolvedClipPath = resolveClipPathObject(style.clipPath, state, locals);
  if (resolvedClipPath) {
    const clipPathCss = clipPathToCss(resolvedClipPath);
    if (clipPathCss) {
      (css as Record<string, unknown>).clipPath = clipPathCss;
    }
  }

  return css;
}

// ---------------------------------------------------------------------------
// mapTransition — convert structured transition to CSS string
// ---------------------------------------------------------------------------

/**
 * Convert a TransitionDef or TransitionDef[] to a CSS transition string.
 *
 * @example
 *   mapTransition({ property: 'height', duration: 600, easing: 'ease' })
 *   // => "height 600ms ease"
 *
 *   mapTransition([
 *     { property: 'height', duration: 600, easing: 'ease' },
 *     { property: 'opacity', duration: 300 },
 *   ])
 *   // => "height 600ms ease, opacity 300ms"
 */
/**
 * Map from SUU camelCase property names to valid CSS property names.
 * Most properties are simple camelCase → kebab-case, but some
 * (like borderRadius directional variants) have non-obvious CSS names.
 */
const CSS_PROPERTY_NAME_MAP: Record<string, string> = {
  borderRadiusTopLeft: 'border-top-left-radius',
  borderRadiusTopRight: 'border-top-right-radius',
  borderRadiusBottomLeft: 'border-bottom-left-radius',
  borderRadiusBottomRight: 'border-bottom-right-radius',
};

/**
 * Convert a SUU camelCase property name to its CSS property name.
 * Uses explicit mapping for irregular names, falls back to
 * generic camelCase → kebab-case conversion.
 */
function toCssPropertyName(prop: string): string {
  if (prop in CSS_PROPERTY_NAME_MAP) {
    return CSS_PROPERTY_NAME_MAP[prop];
  }
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function mapTransition(transition: unknown): string | undefined {
  if (!transition) return undefined;

  const items = Array.isArray(transition) ? transition : [transition];
  const parts: string[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const t = item as Record<string, unknown>;
    const property = t.property;
    const duration = t.duration;
    if (typeof property !== 'string' || typeof duration !== 'number') continue;
    if (!Number.isFinite(duration) || duration < 0 || duration > TRANSITION_DURATION_MAX) {
      continue;
    }

    // Defense-in-depth: reject properties not in whitelist at render time
    if (!(ALLOWED_TRANSITION_PROPERTIES as readonly string[]).includes(property)) {
      continue;
    }

    // Defense-in-depth: reject easing values that aren't in the allowed set
    const ALLOWED_EASINGS = new Set(['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out']);

    // Convert SUU property name to valid CSS property name
    const cssProperty = toCssPropertyName(property);

    let part = `${cssProperty} ${duration}ms`;
    if (typeof t.easing === 'string' && ALLOWED_EASINGS.has(t.easing)) {
      part += ` ${t.easing}`;
    }
    if (
      typeof t.delay === 'number' &&
      (
        !Number.isFinite(t.delay) ||
        t.delay < 0 ||
        t.delay > TRANSITION_DELAY_MAX
      )
    ) {
      continue;
    }
    if (typeof t.delay === 'number' && t.delay > 0) {
      part += ` ${t.delay}ms`;
    }
    parts.push(part);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}
