export type StyleRecord = Record<string, unknown>;
export type CardStyleMap = Record<string, StyleRecord>;
export type ResponsiveMode = 'default' | 'medium' | 'compact';

export interface StyleSemanticsInput {
  style?: StyleRecord;
  responsive?: Record<string, unknown>;
}

export const RESPONSIVE_MODES: readonly ResponsiveMode[] = [
  'default',
  'medium',
  'compact',
] as const;

export function mergeNamedStyleRef(
  style: StyleRecord | undefined,
  cardStyles: CardStyleMap | undefined,
): StyleRecord | undefined {
  if (!style) {
    return undefined;
  }

  const rawStyleName = style.$style;
  const styleName = typeof rawStyleName === 'string' ? rawStyleName.trim() : rawStyleName;
  const inlineWithoutStyleRef =
    style.$style !== undefined ? (({ $style: _, ...rest }) => rest)(style) : style;

  if (!styleName || typeof styleName !== 'string' || !cardStyles) {
    return inlineWithoutStyleRef;
  }

  const baseStyle = cardStyles[styleName];
  if (!baseStyle) {
    return inlineWithoutStyleRef;
  }

  return { ...baseStyle, ...inlineWithoutStyleRef };
}

export function getResponsiveStyleOverride(
  responsive: Record<string, unknown> | undefined,
  mode: Exclude<ResponsiveMode, 'default'>,
): StyleRecord | undefined {
  if (!responsive) {
    return undefined;
  }

  const override = responsive[mode];
  if (override == null || typeof override !== 'object' || Array.isArray(override)) {
    return undefined;
  }

  return override as StyleRecord;
}

export function stripResponsiveUnsupportedFields(
  style: StyleRecord | undefined,
): StyleRecord | undefined {
  if (!style) {
    return undefined;
  }

  const { hoverStyle: _hoverStyle, transition: _transition, ...rest } = style;
  return rest;
}

export function getMergedResponsiveStyleOverride(
  responsive: Record<string, unknown> | undefined,
  cardStyles: CardStyleMap | undefined,
  mode: Exclude<ResponsiveMode, 'default'>,
): StyleRecord | undefined {
  return mergeNamedStyleRef(getResponsiveStyleOverride(responsive, mode), cardStyles);
}

export function getEffectiveStyleForMode(
  input: StyleSemanticsInput,
  cardStyles: CardStyleMap | undefined,
  mode: ResponsiveMode,
): StyleRecord | undefined {
  const baseStyle = mergeNamedStyleRef(input.style, cardStyles);
  if (mode === 'default') {
    return baseStyle;
  }

  const mediumStyle = stripResponsiveUnsupportedFields(
    getMergedResponsiveStyleOverride(input.responsive, cardStyles, 'medium'),
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

  const compactStyle = stripResponsiveUnsupportedFields(
    getMergedResponsiveStyleOverride(input.responsive, cardStyles, 'compact'),
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
