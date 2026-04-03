import type { TraversableNode } from './traverse.js';

export type ResponsiveMode = 'default' | 'compact';

export const RESPONSIVE_MODES: readonly ResponsiveMode[] = [
  'default',
  'compact',
] as const;

function mergeNamedStyle(
  style: Record<string, unknown> | undefined,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!style) return undefined;

  const rawStyleName = style.$style;
  const styleName = typeof rawStyleName === 'string' ? rawStyleName.trim() : rawStyleName;
  if (!styleName || typeof styleName !== 'string' || !cardStyles) {
    if (style.$style !== undefined) {
      const { $style: _, ...rest } = style;
      return rest;
    }
    return style;
  }

  const baseStyle = cardStyles[styleName];
  if (!baseStyle) {
    const { $style: _, ...rest } = style;
    return rest;
  }

  const { $style: _, ...inlineWithoutStyleRef } = style;
  return { ...baseStyle, ...inlineWithoutStyleRef };
}

function getCompactResponsiveStyle(
  node: TraversableNode,
): Record<string, unknown> | undefined {
  const responsive = node.responsive;
  if (
    responsive == null ||
    typeof responsive !== 'object' ||
    Array.isArray(responsive)
  ) {
    return undefined;
  }

  const compact = (responsive as Record<string, unknown>).compact;
  if (
    compact == null ||
    typeof compact !== 'object' ||
    Array.isArray(compact)
  ) {
    return undefined;
  }

  return compact as Record<string, unknown>;
}

function stripResponsiveOnlyUnsupportedFields(
  style: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!style) return undefined;

  const {
    hoverStyle: _hoverStyle,
    transition: _transition,
    ...rest
  } = style;

  return rest;
}

export function getEffectiveStyleForMode(
  node: TraversableNode,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  mode: ResponsiveMode,
): Record<string, unknown> | undefined {
  const baseStyle = mergeNamedStyle(node.style, cardStyles);
  if (mode === 'default') {
    return baseStyle;
  }

  const compactStyle = stripResponsiveOnlyUnsupportedFields(
    mergeNamedStyle(getCompactResponsiveStyle(node), cardStyles),
  );

  if (!compactStyle) {
    return baseStyle;
  }

  return {
    ...(baseStyle ?? {}),
    ...compactStyle,
  };
}

export function getMergedCompactResponsiveStyle(
  node: TraversableNode,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  return mergeNamedStyle(getCompactResponsiveStyle(node), cardStyles);
}
