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
 *   - backgroundGradient object -> CSS background string
 *   - Dynamic values ($ref/$expr) are resolved via state-resolver
 */

import type { CSSProperties } from 'react';
import { ALLOWED_TRANSITION_PROPERTIES } from '@safe-ugc-ui/types';
import { resolveValue } from './state-resolver.js';

// ---------------------------------------------------------------------------
// Whitelist of style properties that map directly to CSS
// ---------------------------------------------------------------------------

const DIRECT_MAP_PROPS = [
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'alignSelf',
  'flexWrap', 'flex', 'gap', 'width', 'height', 'minWidth', 'maxWidth',
  'minHeight', 'maxHeight', 'padding', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'margin', 'marginTop', 'marginRight',
  'marginBottom', 'marginLeft', 'backgroundColor', 'color', 'borderRadius',
  'borderRadiusTopLeft', 'borderRadiusTopRight',
  'borderRadiusBottomLeft', 'borderRadiusBottomRight',
  'fontSize', 'fontWeight', 'fontStyle', 'textAlign', 'textDecoration',
  'lineHeight', 'letterSpacing', 'opacity', 'overflow', 'position',
  'top', 'right', 'bottom', 'left', 'zIndex',
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
] as const;

// ---------------------------------------------------------------------------
// Forbidden CSS functions (defense-in-depth)
// ---------------------------------------------------------------------------

const FORBIDDEN_CSS_FUNCTIONS_LOWER = ['url(', 'var(', 'calc(', 'env(', 'expression('];

function containsForbiddenCssFunction(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_CSS_FUNCTIONS_LOWER.some(fn => lower.includes(fn));
}

// ---------------------------------------------------------------------------
// Helper: resolve a style value (may be literal, $ref, or $expr)
// ---------------------------------------------------------------------------

function resolveStyleValue(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): unknown {
  return resolveValue(value, state, locals);
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

  // Default to linear
  const direction = (gradient.direction as string) ?? '180deg';
  return `linear-gradient(${direction}, ${stopsStr})`;
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
 * @param style - The style object from a UGC node (may contain $ref/$expr values)
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
      let resolved = resolveStyleValue(style[prop], state, locals);
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
        (css as Record<string, unknown>)[prop] = resolved;
      }
    }
  }

  // Transform object -> CSS transform string
  if (style.transform && typeof style.transform === 'object') {
    css.transform = transformToCss(style.transform as Record<string, unknown>);
  }

  // Border shorthand
  if (style.border && typeof style.border === 'object') {
    css.border = borderToCss(style.border as Record<string, unknown>);
  }

  // Border sides (borderTop, borderRight, borderBottom, borderLeft)
  for (const side of ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const) {
    if (style[side] && typeof style[side] === 'object') {
      (css as Record<string, unknown>)[side] = borderToCss(
        style[side] as Record<string, unknown>,
      );
    }
  }

  // Box shadow
  if (style.boxShadow) {
    css.boxShadow = shadowToCss(style.boxShadow);
  }

  // Background gradient -> CSS background
  if (style.backgroundGradient && typeof style.backgroundGradient === 'object') {
    css.background = gradientToCss(
      style.backgroundGradient as Record<string, unknown>,
    );
  }

  // Transition object(s) -> CSS transition string
  if (style.transition) {
    const transitionCss = mapTransition(style.transition);
    if (transitionCss) {
      css.transition = transitionCss;
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
    if (typeof t.delay === 'number' && t.delay > 0) {
      part += ` ${t.delay}ms`;
    }
    parts.push(part);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}
