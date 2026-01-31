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
  'fontSize', 'fontWeight', 'fontStyle', 'textAlign', 'textDecoration',
  'lineHeight', 'letterSpacing', 'opacity', 'overflow', 'position',
  'top', 'right', 'bottom', 'left', 'zIndex',
] as const;

// ---------------------------------------------------------------------------
// Helper: resolve a style value (may be literal, $ref, or $expr)
// ---------------------------------------------------------------------------

function resolveStyleValue(
  value: unknown,
  state: Record<string, unknown>,
): unknown {
  return resolveValue(value, state);
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
 * @returns A React CSSProperties object
 */
export function mapStyle(
  style: Record<string, unknown> | undefined,
  state: Record<string, unknown>,
): CSSProperties {
  if (!style) return {};

  const css: CSSProperties = {};

  // Direct-mapped properties (resolve dynamic values)
  for (const prop of DIRECT_MAP_PROPS) {
    if (prop in style) {
      let resolved = resolveStyleValue(style[prop], state);
      if (resolved !== undefined) {
        // Map spec alignment values (start/end) to CSS flexbox values
        if (
          FLEX_ALIGNMENT_PROPS.has(prop) &&
          typeof resolved === 'string' &&
          resolved in FLEX_ALIGNMENT_MAP
        ) {
          resolved = FLEX_ALIGNMENT_MAP[resolved];
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

  return css;
}
