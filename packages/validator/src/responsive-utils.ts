import type { TraversableNode } from './traverse.js';

export type ResponsiveMode = 'default' | 'medium' | 'compact';

export const RESPONSIVE_MODES: readonly ResponsiveMode[] = [
  'default',
  'medium',
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

function getResponsiveStyle(
  node: TraversableNode,
  mode: Exclude<ResponsiveMode, 'default'>,
): Record<string, unknown> | undefined {
  const responsive = node.responsive;
  if (
    responsive == null ||
    typeof responsive !== 'object' ||
    Array.isArray(responsive)
  ) {
    return undefined;
  }

  const override = (responsive as Record<string, unknown>)[mode];
  if (
    override == null ||
    typeof override !== 'object' ||
    Array.isArray(override)
  ) {
    return undefined;
  }

  return override as Record<string, unknown>;
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

  const mediumStyle = stripResponsiveOnlyUnsupportedFields(
    mergeNamedStyle(getResponsiveStyle(node, 'medium'), cardStyles),
  );

  if (mode === 'medium') {
    if (!mediumStyle) {
      return baseStyle;
    }

    return {
      ...(baseStyle ?? {}),
      ...mediumStyle,
    };
  }

  const compactStyle = stripResponsiveOnlyUnsupportedFields(
    mergeNamedStyle(getResponsiveStyle(node, 'compact'), cardStyles),
  );

  if (!mediumStyle && !compactStyle) {
    return baseStyle;
  }

  return {
    ...(baseStyle ?? {}),
    ...(mediumStyle ?? {}),
    ...compactStyle,
  };
}

export function getMergedResponsiveStyleOverride(
  node: TraversableNode,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  mode: Exclude<ResponsiveMode, 'default'>,
): Record<string, unknown> | undefined {
  return mergeNamedStyle(getResponsiveStyle(node, mode), cardStyles);
}
