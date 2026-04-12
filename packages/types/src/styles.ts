/**
 * @safe-ugc-ui/types — Style System
 *
 * Defines Zod schemas and inferred TypeScript types for the style system.
 * Based on spec sections 3.1-3.8 (style properties) and 4.3 (style value types).
 *
 * Naming convention:
 *   - Zod schema  -> `fooSchema`
 *   - Inferred TS -> `Foo`
 *
 * Dynamic fields accept literal | $ref.
 * Static fields accept literal only (no $ref).
 */

import { z } from 'zod';
import {
  ALLOWED_ALIGN_ITEMS_VALUES,
  ALLOWED_ALIGN_SELF_VALUES,
  ALLOWED_BORDER_STYLE_VALUES,
  ALLOWED_DISPLAY_VALUES,
  ALLOWED_FLEX_DIRECTION_VALUES,
  ALLOWED_FONT_FAMILIES,
  ALLOWED_FONT_STYLE_VALUES,
  ALLOWED_FLEX_WRAP_VALUES,
  ALLOWED_JUSTIFY_CONTENT_VALUES,
  ALLOWED_OBJECT_FIT_VALUES,
  ALLOWED_POSITION_VALUES,
  ALLOWED_OVERFLOW_VALUES,
  ALLOWED_TEXT_ALIGN_VALUES,
  ALLOWED_TEXT_DECORATION_VALUES,
  ALLOWED_TRANSITION_EASINGS,
  ASPECT_RATIO_PATTERN,
} from './constants.js';
import { refSchema, dynamicSchema, colorSchema, lengthSchema, percentageSchema } from './values.js';

// ===========================================================================
// 1. Structured objects (Static only — no dynamic wrappers)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1.1 GradientStop
// ---------------------------------------------------------------------------

export const gradientStopSchema = z.object({
  color: dynamicSchema(z.string()),
  position: dynamicSchema(z.string()), // e.g. "0%", "100%"
});

export type GradientStop = z.infer<typeof gradientStopSchema>;

// ---------------------------------------------------------------------------
// 1.2 LinearGradient
// ---------------------------------------------------------------------------

export const linearGradientSchema = z.object({
  type: z.literal('linear'),
  direction: dynamicSchema(z.string()), // e.g. "135deg", "to right"
  stops: z.array(gradientStopSchema),
});

export type LinearGradient = z.infer<typeof linearGradientSchema>;

// ---------------------------------------------------------------------------
// 1.3 RadialGradient
// ---------------------------------------------------------------------------

export const radialGradientSchema = z.object({
  type: z.literal('radial'),
  stops: z.array(gradientStopSchema),
});

export type RadialGradient = z.infer<typeof radialGradientSchema>;

// ---------------------------------------------------------------------------
// 1.4 RepeatingLinearGradient
// ---------------------------------------------------------------------------

export const repeatingLinearGradientSchema = z.object({
  type: z.literal('repeating-linear'),
  direction: dynamicSchema(z.string()), // e.g. "180deg"
  stops: z.array(gradientStopSchema),
});

export type RepeatingLinearGradient = z.infer<typeof repeatingLinearGradientSchema>;

// ---------------------------------------------------------------------------
// 1.5 GradientObject (union)
// ---------------------------------------------------------------------------

export const gradientObjectSchema = z.union([
  linearGradientSchema,
  radialGradientSchema,
  repeatingLinearGradientSchema,
]);

export type GradientObject = z.infer<typeof gradientObjectSchema>;

// ---------------------------------------------------------------------------
// 1.6 ShadowObject
// ---------------------------------------------------------------------------

export const shadowObjectSchema = z.object({
  offsetX: dynamicSchema(z.number()),
  offsetY: dynamicSchema(z.number()),
  blur: dynamicSchema(z.number()).optional(),
  spread: dynamicSchema(z.number()).optional(),
  color: dynamicSchema(z.string()),
});

export type ShadowObject = z.infer<typeof shadowObjectSchema>;

// ---------------------------------------------------------------------------
// 1.7 TextShadowObject
// ---------------------------------------------------------------------------

export const textShadowObjectSchema = z.object({
  offsetX: dynamicSchema(z.number()),
  offsetY: dynamicSchema(z.number()),
  blur: dynamicSchema(z.number()).optional(),
  color: dynamicSchema(z.string()),
});

export type TextShadowObject = z.infer<typeof textShadowObjectSchema>;

// ---------------------------------------------------------------------------
// 1.8 BorderObject
// ---------------------------------------------------------------------------

export const borderStyleValueSchema = z.enum(ALLOWED_BORDER_STYLE_VALUES);

export const borderObjectSchema = z.object({
  width: dynamicSchema(z.number()),
  style: dynamicSchema(borderStyleValueSchema),
  color: dynamicSchema(z.string()),
});

export type BorderObject = z.infer<typeof borderObjectSchema>;

// ---------------------------------------------------------------------------
// 1.9 TransformObject (skew intentionally excluded — forbidden by spec 3.6)
// ---------------------------------------------------------------------------

export const transformObjectSchema = z.object({
  rotate: dynamicSchema(z.string()).optional(), // e.g. "45deg"
  scale: dynamicSchema(z.number()).optional(), // 0.1 ~ 1.5
  translateX: dynamicSchema(z.number()).optional(), // -500 ~ 500
  translateY: dynamicSchema(z.number()).optional(), // -500 ~ 500
});

export type TransformObject = z.infer<typeof transformObjectSchema>;

// ---------------------------------------------------------------------------
// 1.10 ClipPathObject
// ---------------------------------------------------------------------------

export const clipPathCircleSchema = z
  .object({
    type: z.literal('circle'),
    radius: dynamicSchema(lengthSchema),
  })
  .strict();

export const clipPathEllipseSchema = z
  .object({
    type: z.literal('ellipse'),
    rx: dynamicSchema(lengthSchema),
    ry: dynamicSchema(lengthSchema),
  })
  .strict();

export const clipPathInsetSchema = z
  .object({
    type: z.literal('inset'),
    top: dynamicSchema(lengthSchema),
    right: dynamicSchema(lengthSchema),
    bottom: dynamicSchema(lengthSchema),
    left: dynamicSchema(lengthSchema),
    round: dynamicSchema(lengthSchema).optional(),
  })
  .strict();

export const clipPathObjectSchema = z.union([
  clipPathCircleSchema,
  clipPathEllipseSchema,
  clipPathInsetSchema,
]);

export type ClipPathObject = z.infer<typeof clipPathObjectSchema>;

// ===========================================================================
// 2. Enum value types
// ===========================================================================

// ---------------------------------------------------------------------------
// 2.1 PositionValue
// ---------------------------------------------------------------------------

export const positionValueSchema = z.enum(ALLOWED_POSITION_VALUES);
export type PositionValue = z.infer<typeof positionValueSchema>;

// ---------------------------------------------------------------------------
// 2.2 OverflowValue
// ---------------------------------------------------------------------------

export const overflowValueSchema = z.enum(ALLOWED_OVERFLOW_VALUES);
export type OverflowValue = z.infer<typeof overflowValueSchema>;

// ---------------------------------------------------------------------------
// 2.3 DisplayValue
// ---------------------------------------------------------------------------

export const displayValueSchema = z.enum(ALLOWED_DISPLAY_VALUES);
export type DisplayValue = z.infer<typeof displayValueSchema>;

// ---------------------------------------------------------------------------
// 2.4 FlexDirectionValue
// ---------------------------------------------------------------------------

export const flexDirectionValueSchema = z.enum(ALLOWED_FLEX_DIRECTION_VALUES);
export type FlexDirectionValue = z.infer<typeof flexDirectionValueSchema>;

// ---------------------------------------------------------------------------
// 2.5 JustifyContentValue
// ---------------------------------------------------------------------------

export const justifyContentValueSchema = z.enum(ALLOWED_JUSTIFY_CONTENT_VALUES);
export type JustifyContentValue = z.infer<typeof justifyContentValueSchema>;

// ---------------------------------------------------------------------------
// 2.6 AlignItemsValue
// ---------------------------------------------------------------------------

export const alignItemsValueSchema = z.enum(ALLOWED_ALIGN_ITEMS_VALUES);
export type AlignItemsValue = z.infer<typeof alignItemsValueSchema>;

// ---------------------------------------------------------------------------
// 2.7 AlignSelfValue
// ---------------------------------------------------------------------------

export const alignSelfValueSchema = z.enum(ALLOWED_ALIGN_SELF_VALUES);
export type AlignSelfValue = z.infer<typeof alignSelfValueSchema>;

// ---------------------------------------------------------------------------
// 2.8 FlexWrapValue
// ---------------------------------------------------------------------------

export const flexWrapValueSchema = z.enum(ALLOWED_FLEX_WRAP_VALUES);
export type FlexWrapValue = z.infer<typeof flexWrapValueSchema>;

// ---------------------------------------------------------------------------
// 2.9 TextAlignValue
// ---------------------------------------------------------------------------

export const textAlignValueSchema = z.enum(ALLOWED_TEXT_ALIGN_VALUES);
export type TextAlignValue = z.infer<typeof textAlignValueSchema>;

// ---------------------------------------------------------------------------
// 2.10 TextDecorationValue
// ---------------------------------------------------------------------------

export const textDecorationValueSchema = z.enum(ALLOWED_TEXT_DECORATION_VALUES);
export type TextDecorationValue = z.infer<typeof textDecorationValueSchema>;

// ---------------------------------------------------------------------------
// 2.11 FontStyleValue
// ---------------------------------------------------------------------------

export const fontStyleValueSchema = z.enum(ALLOWED_FONT_STYLE_VALUES);
export type FontStyleValue = z.infer<typeof fontStyleValueSchema>;

// ---------------------------------------------------------------------------
// 2.12 FontFamilyValue
// ---------------------------------------------------------------------------

export const fontFamilyValueSchema = z.enum(ALLOWED_FONT_FAMILIES);
export type FontFamilyValue = z.infer<typeof fontFamilyValueSchema>;

// ---------------------------------------------------------------------------
// 2.13 FontWeightValue
// ---------------------------------------------------------------------------

export const fontWeightValueSchema = z.union([
  z.enum(['normal', 'bold']),
  z.literal('100'),
  z.literal('200'),
  z.literal('300'),
  z.literal('400'),
  z.literal('500'),
  z.literal('600'),
  z.literal('700'),
  z.literal('800'),
  z.literal('900'),
  z.literal(100),
  z.literal(200),
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
  z.literal(900),
]);
export type FontWeightValue = z.infer<typeof fontWeightValueSchema>;

// ===========================================================================
// 3. TransitionDef — constrained CSS transition declaration (spec 3.9)
// ===========================================================================

export const easingValueSchema = z.enum(ALLOWED_TRANSITION_EASINGS);

export type EasingValue = z.infer<typeof easingValueSchema>;

export const transitionDefSchema = z.object({
  property: z.string(),
  duration: z.number(),
  easing: easingValueSchema.optional(),
  delay: z.number().optional(),
});

export type TransitionDef = z.infer<typeof transitionDefSchema>;

const transitionFieldSchema = z
  .union([transitionDefSchema, z.array(transitionDefSchema)])
  .optional();

// ===========================================================================
// 3.1 TextSpanStyle — restricted inline text styling only
// ===========================================================================

export const textSpanStyleSchema = z
  .object({
    backgroundColor: dynamicSchema(colorSchema).optional(),
    color: dynamicSchema(colorSchema).optional(),
    fontFamily: dynamicSchema(fontFamilyValueSchema).optional(),
    fontSize: dynamicSchema(lengthSchema).optional(),
    fontWeight: dynamicSchema(fontWeightValueSchema).optional(),
    fontStyle: dynamicSchema(fontStyleValueSchema).optional(),
    textDecoration: dynamicSchema(textDecorationValueSchema).optional(),
    letterSpacing: dynamicSchema(lengthSchema).optional(),
    textShadow: z.union([textShadowObjectSchema, z.array(textShadowObjectSchema)]).optional(),
  })
  .strict();

export type TextSpanStyle = z.infer<typeof textSpanStyleSchema>;

// ===========================================================================
// 4. StyleProps — the main style schema (spec 4.3)
//
// Dynamic fields: literal | $ref  -> dynamicSchema(base).optional()
// Static fields:  literal only    -> base.optional()
// ===========================================================================

/**
 * Helper: a size value that can be a Length, Percentage, or the literal "auto".
 * Used for width/height properties.
 */
const sizeValueSchema = z.union([lengthSchema, percentageSchema, z.literal('auto')]);

/**
 * Helper: lineHeight can be a bare number (multiplier) or a length.
 */
const lineHeightValueSchema = z.union([z.number(), lengthSchema]);

/**
 * Core style shape shared by both stylePropsSchema and hoverStylePropsSchema.
 * Extracted to avoid duplication and keep hoverStyle aligned with base style.
 */
const coreStyleShape = {
  // -----------------------------------------------------------------------
  // Layout — Dynamic
  // -----------------------------------------------------------------------
  display: dynamicSchema(displayValueSchema).optional(),
  flexDirection: dynamicSchema(flexDirectionValueSchema).optional(),
  justifyContent: dynamicSchema(justifyContentValueSchema).optional(),
  alignItems: dynamicSchema(alignItemsValueSchema).optional(),
  alignSelf: dynamicSchema(alignSelfValueSchema).optional(),
  flexWrap: dynamicSchema(flexWrapValueSchema).optional(),
  flex: dynamicSchema(z.number()).optional(),
  gap: dynamicSchema(lengthSchema).optional(),

  // -----------------------------------------------------------------------
  // Sizing — Dynamic
  // -----------------------------------------------------------------------
  width: dynamicSchema(sizeValueSchema).optional(),
  height: dynamicSchema(sizeValueSchema).optional(),
  aspectRatio: dynamicSchema(
    z.union([z.number().positive(), z.string().regex(ASPECT_RATIO_PATTERN)]),
  ).optional(),
  minWidth: dynamicSchema(z.union([lengthSchema, percentageSchema])).optional(),
  maxWidth: dynamicSchema(z.union([lengthSchema, percentageSchema])).optional(),
  minHeight: dynamicSchema(z.union([lengthSchema, percentageSchema])).optional(),
  maxHeight: dynamicSchema(z.union([lengthSchema, percentageSchema])).optional(),

  // -----------------------------------------------------------------------
  // Spacing — Dynamic
  // -----------------------------------------------------------------------
  padding: dynamicSchema(lengthSchema).optional(),
  paddingTop: dynamicSchema(lengthSchema).optional(),
  paddingRight: dynamicSchema(lengthSchema).optional(),
  paddingBottom: dynamicSchema(lengthSchema).optional(),
  paddingLeft: dynamicSchema(lengthSchema).optional(),
  margin: dynamicSchema(lengthSchema).optional(),
  marginTop: dynamicSchema(lengthSchema).optional(),
  marginRight: dynamicSchema(lengthSchema).optional(),
  marginBottom: dynamicSchema(lengthSchema).optional(),
  marginLeft: dynamicSchema(lengthSchema).optional(),

  // -----------------------------------------------------------------------
  // Colors — Dynamic
  // -----------------------------------------------------------------------
  backgroundColor: dynamicSchema(colorSchema).optional(),
  color: dynamicSchema(colorSchema).optional(),

  // -----------------------------------------------------------------------
  // Border radius — Dynamic
  // -----------------------------------------------------------------------
  borderRadius: dynamicSchema(lengthSchema).optional(),
  borderRadiusTopLeft: dynamicSchema(lengthSchema).optional(),
  borderRadiusTopRight: dynamicSchema(lengthSchema).optional(),
  borderRadiusBottomLeft: dynamicSchema(lengthSchema).optional(),
  borderRadiusBottomRight: dynamicSchema(lengthSchema).optional(),

  // -----------------------------------------------------------------------
  // Typography — Dynamic
  // -----------------------------------------------------------------------
  fontFamily: dynamicSchema(fontFamilyValueSchema).optional(),
  fontSize: dynamicSchema(lengthSchema).optional(),
  fontWeight: dynamicSchema(fontWeightValueSchema).optional(),
  fontStyle: dynamicSchema(fontStyleValueSchema).optional(),
  textAlign: dynamicSchema(textAlignValueSchema).optional(),
  textDecoration: dynamicSchema(textDecorationValueSchema).optional(),
  lineHeight: dynamicSchema(lineHeightValueSchema).optional(),
  letterSpacing: dynamicSchema(lengthSchema).optional(),

  // -----------------------------------------------------------------------
  // Opacity — Dynamic
  // -----------------------------------------------------------------------
  opacity: dynamicSchema(z.number()).optional(),
  backdropBlur: dynamicSchema(z.number()).optional(),

  // -----------------------------------------------------------------------
  // Gradient — Static only
  // -----------------------------------------------------------------------
  backgroundGradient: gradientObjectSchema.optional(),

  // -----------------------------------------------------------------------
  // Shadow — Static only (single or array of shadows)
  // -----------------------------------------------------------------------
  boxShadow: z.union([shadowObjectSchema, z.array(shadowObjectSchema)]).optional(),

  // -----------------------------------------------------------------------
  // Text shadow — Static only (single or array of shadows)
  // -----------------------------------------------------------------------
  textShadow: z.union([textShadowObjectSchema, z.array(textShadowObjectSchema)]).optional(),

  // -----------------------------------------------------------------------
  // Borders — Static only
  // -----------------------------------------------------------------------
  border: borderObjectSchema.optional(),
  borderTop: borderObjectSchema.optional(),
  borderRight: borderObjectSchema.optional(),
  borderBottom: borderObjectSchema.optional(),
  borderLeft: borderObjectSchema.optional(),

  // -----------------------------------------------------------------------
  // Transform — Static only (skew excluded)
  // -----------------------------------------------------------------------
  transform: transformObjectSchema.optional(),
  clipPath: clipPathObjectSchema.optional(),

  // -----------------------------------------------------------------------
  // Overflow — Static only
  // -----------------------------------------------------------------------
  overflow: overflowValueSchema.optional(),

  // -----------------------------------------------------------------------
  // Position — Static only
  // -----------------------------------------------------------------------
  position: positionValueSchema.optional(),
  top: lengthSchema.optional(),
  right: lengthSchema.optional(),
  bottom: lengthSchema.optional(),
  left: lengthSchema.optional(),

  // -----------------------------------------------------------------------
  // Object-fit — Dynamic (for Image nodes)
  // -----------------------------------------------------------------------
  objectFit: dynamicSchema(z.enum(ALLOWED_OBJECT_FIT_VALUES)).optional(),
  objectPosition: dynamicSchema(z.string()).optional(),

  // -----------------------------------------------------------------------
  // Grid — Dynamic
  // -----------------------------------------------------------------------
  gridTemplateColumns: dynamicSchema(z.string()).optional(),
  gridTemplateRows: dynamicSchema(z.string()).optional(),
  gridColumn: dynamicSchema(z.string()).optional(),
  gridRow: dynamicSchema(z.string()).optional(),

  // -----------------------------------------------------------------------
  // z-index — Static only (0-100 enforced at validation layer)
  // -----------------------------------------------------------------------
  zIndex: z.number().optional(),

  // -----------------------------------------------------------------------
  // $style — reference to a named style in card.styles
  // -----------------------------------------------------------------------
  $style: z.string().optional(),
};

// ---------------------------------------------------------------------------
// HoverStyleProps — same as core style + transition, but NO hoverStyle
// (prevents infinite nesting)
// ---------------------------------------------------------------------------

export const hoverStylePropsSchema = z
  .object({
    ...coreStyleShape,
    transition: transitionFieldSchema,
  })
  .strict();

export type HoverStyleProps = z.infer<typeof hoverStylePropsSchema>;

// ---------------------------------------------------------------------------
// ResponsiveStyleProps — core style only (no hoverStyle / transition)
// ---------------------------------------------------------------------------

export const responsiveStylePropsSchema = z
  .object({
    ...coreStyleShape,
  })
  .strict();

export type ResponsiveStyleProps = z.infer<typeof responsiveStylePropsSchema>;

// ---------------------------------------------------------------------------
// ResponsiveProps — node-level breakpoint overrides
// ---------------------------------------------------------------------------

export const responsivePropsSchema = z
  .object({
    medium: responsiveStylePropsSchema.optional(),
    compact: responsiveStylePropsSchema.optional(),
  })
  .strict();

export type ResponsiveProps = z.infer<typeof responsivePropsSchema>;

// ---------------------------------------------------------------------------
// StyleProps — core style + hoverStyle + transition
// ---------------------------------------------------------------------------

export const stylePropsSchema = z
  .object({
    ...coreStyleShape,
    hoverStyle: hoverStylePropsSchema.optional(),
    transition: transitionFieldSchema,
  })
  .strict();

export type StyleProps = z.infer<typeof stylePropsSchema>;
