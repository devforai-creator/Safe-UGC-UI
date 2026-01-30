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
 * Dynamic fields accept literal | $ref | $expr.
 * Static fields accept literal only (no $ref, no $expr).
 */

import { z } from 'zod';
import {
  refSchema,
  exprSchema,
  dynamicSchema,
  colorSchema,
  lengthSchema,
  percentageSchema,
} from './values.js';

// ===========================================================================
// 1. Structured objects (Static only — no dynamic wrappers)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1.1 GradientStop
// ---------------------------------------------------------------------------

export const gradientStopSchema = z.object({
  color: z.string(),
  position: z.string(), // e.g. "0%", "100%"
});

export type GradientStop = z.infer<typeof gradientStopSchema>;

// ---------------------------------------------------------------------------
// 1.2 LinearGradient
// ---------------------------------------------------------------------------

export const linearGradientSchema = z.object({
  type: z.literal('linear'),
  direction: z.string(), // e.g. "135deg", "to right"
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
// 1.4 GradientObject (union)
// ---------------------------------------------------------------------------

export const gradientObjectSchema = z.union([
  linearGradientSchema,
  radialGradientSchema,
]);

export type GradientObject = z.infer<typeof gradientObjectSchema>;

// ---------------------------------------------------------------------------
// 1.5 ShadowObject
// ---------------------------------------------------------------------------

export const shadowObjectSchema = z.object({
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().optional(),
  spread: z.number().optional(),
  color: z.string(),
});

export type ShadowObject = z.infer<typeof shadowObjectSchema>;

// ---------------------------------------------------------------------------
// 1.6 BorderObject
// ---------------------------------------------------------------------------

export const borderObjectSchema = z.object({
  width: z.number(),
  style: z.enum(['solid', 'dashed', 'dotted', 'none']),
  color: z.string(),
});

export type BorderObject = z.infer<typeof borderObjectSchema>;

// ---------------------------------------------------------------------------
// 1.7 TransformObject (skew intentionally excluded — forbidden by spec 3.6)
// ---------------------------------------------------------------------------

export const transformObjectSchema = z.object({
  rotate: z.string().optional(),    // e.g. "45deg"
  scale: z.number().optional(),     // 0.1 ~ 1.5
  translateX: z.number().optional(), // -500 ~ 500
  translateY: z.number().optional(), // -500 ~ 500
});

export type TransformObject = z.infer<typeof transformObjectSchema>;

// ===========================================================================
// 2. Enum value types
// ===========================================================================

// ---------------------------------------------------------------------------
// 2.1 PositionValue
// ---------------------------------------------------------------------------

export const positionValueSchema = z.enum(['static', 'relative', 'absolute']);
export type PositionValue = z.infer<typeof positionValueSchema>;

// ---------------------------------------------------------------------------
// 2.2 OverflowValue
// ---------------------------------------------------------------------------

export const overflowValueSchema = z.enum(['visible', 'hidden', 'auto']);
export type OverflowValue = z.infer<typeof overflowValueSchema>;

// ---------------------------------------------------------------------------
// 2.3 DisplayValue
// ---------------------------------------------------------------------------

export const displayValueSchema = z.enum(['flex', 'block', 'none']);
export type DisplayValue = z.infer<typeof displayValueSchema>;

// ---------------------------------------------------------------------------
// 2.4 FlexDirectionValue
// ---------------------------------------------------------------------------

export const flexDirectionValueSchema = z.enum([
  'row',
  'column',
  'row-reverse',
  'column-reverse',
]);
export type FlexDirectionValue = z.infer<typeof flexDirectionValueSchema>;

// ---------------------------------------------------------------------------
// 2.5 JustifyContentValue
// ---------------------------------------------------------------------------

export const justifyContentValueSchema = z.enum([
  'start',
  'center',
  'end',
  'space-between',
  'space-around',
  'space-evenly',
]);
export type JustifyContentValue = z.infer<typeof justifyContentValueSchema>;

// ---------------------------------------------------------------------------
// 2.6 AlignItemsValue
// ---------------------------------------------------------------------------

export const alignItemsValueSchema = z.enum([
  'start',
  'center',
  'end',
  'stretch',
  'baseline',
]);
export type AlignItemsValue = z.infer<typeof alignItemsValueSchema>;

// ---------------------------------------------------------------------------
// 2.7 AlignSelfValue
// ---------------------------------------------------------------------------

export const alignSelfValueSchema = z.enum([
  'auto',
  'start',
  'center',
  'end',
  'stretch',
]);
export type AlignSelfValue = z.infer<typeof alignSelfValueSchema>;

// ---------------------------------------------------------------------------
// 2.8 FlexWrapValue
// ---------------------------------------------------------------------------

export const flexWrapValueSchema = z.enum(['nowrap', 'wrap', 'wrap-reverse']);
export type FlexWrapValue = z.infer<typeof flexWrapValueSchema>;

// ---------------------------------------------------------------------------
// 2.9 TextAlignValue
// ---------------------------------------------------------------------------

export const textAlignValueSchema = z.enum([
  'left',
  'center',
  'right',
  'justify',
]);
export type TextAlignValue = z.infer<typeof textAlignValueSchema>;

// ---------------------------------------------------------------------------
// 2.10 TextDecorationValue
// ---------------------------------------------------------------------------

export const textDecorationValueSchema = z.enum([
  'none',
  'underline',
  'line-through',
]);
export type TextDecorationValue = z.infer<typeof textDecorationValueSchema>;

// ---------------------------------------------------------------------------
// 2.11 FontStyleValue
// ---------------------------------------------------------------------------

export const fontStyleValueSchema = z.enum(['normal', 'italic']);
export type FontStyleValue = z.infer<typeof fontStyleValueSchema>;

// ---------------------------------------------------------------------------
// 2.12 FontWeightValue
// ---------------------------------------------------------------------------

export const fontWeightValueSchema = z.union([
  z.enum(['normal', 'bold']),
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
// 3. StyleProps — the main style schema (spec 4.3)
//
// Dynamic fields: literal | $ref | $expr  -> dynamicSchema(base).optional()
// Static fields:  literal only            -> base.optional()
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

export const stylePropsSchema = z.object({
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

  // -----------------------------------------------------------------------
  // Typography — Dynamic
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Gradient — Static only
  // -----------------------------------------------------------------------
  backgroundGradient: gradientObjectSchema.optional(),

  // -----------------------------------------------------------------------
  // Shadow — Static only (single or array of shadows)
  // -----------------------------------------------------------------------
  boxShadow: z
    .union([shadowObjectSchema, z.array(shadowObjectSchema)])
    .optional(),

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
  // z-index — Static only (0-100 enforced at validation layer)
  // -----------------------------------------------------------------------
  zIndex: z.number().optional(),
});

export type StyleProps = z.infer<typeof stylePropsSchema>;
