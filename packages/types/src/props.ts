/**
 * @safe-ugc-ui/types — Component Fields
 *
 * Defines Zod schemas and inferred TypeScript types for each component's
 * field set (formerly `props`). Based on spec section 4.2.
 *
 * Security-sensitive fields use restricted value types:
 *   - Image.src, Avatar.src  -> refOnly  (no $expr — prevents URL manipulation)
 *   - Icon.name              -> static   (no $ref, no $expr)
 *   - All others             -> dynamic  (literal | $ref | $expr)
 *
 * Naming convention:
 *   - Zod schema  -> `fooPropsSchema`
 *   - Inferred TS -> `FooProps`
 */

import { z } from 'zod';
import {
  dynamicSchema,
  refOnlySchema,
  assetPathSchema,
  colorSchema,
  lengthSchema,
  iconNameSchema,
} from './values.js';

// ---------------------------------------------------------------------------
// 1. TextProps
// ---------------------------------------------------------------------------

export const textPropsSchema = z.object({
  content: dynamicSchema(z.string()),
});

export type TextProps = z.infer<typeof textPropsSchema>;

// ---------------------------------------------------------------------------
// 2. ImageProps
// ---------------------------------------------------------------------------

export const imagePropsSchema = z.object({
  src: refOnlySchema(assetPathSchema),
  alt: dynamicSchema(z.string()).optional(),
});

export type ImageProps = z.infer<typeof imagePropsSchema>;

// ---------------------------------------------------------------------------
// 3. ProgressBarProps
// ---------------------------------------------------------------------------

export const progressBarPropsSchema = z.object({
  value: dynamicSchema(z.number()),
  max: dynamicSchema(z.number()),
  color: dynamicSchema(colorSchema).optional(),
});

export type ProgressBarProps = z.infer<typeof progressBarPropsSchema>;

// ---------------------------------------------------------------------------
// 4. AvatarProps
// ---------------------------------------------------------------------------

export const avatarPropsSchema = z.object({
  src: refOnlySchema(assetPathSchema),
  size: dynamicSchema(lengthSchema).optional(),
});

export type AvatarProps = z.infer<typeof avatarPropsSchema>;

// ---------------------------------------------------------------------------
// 5. IconProps
// ---------------------------------------------------------------------------

export const iconPropsSchema = z.object({
  name: iconNameSchema,
  size: dynamicSchema(lengthSchema).optional(),
  color: dynamicSchema(colorSchema).optional(),
});

export type IconProps = z.infer<typeof iconPropsSchema>;

// ---------------------------------------------------------------------------
// 6. BadgeProps
// ---------------------------------------------------------------------------

export const badgePropsSchema = z.object({
  label: dynamicSchema(z.string()),
  color: dynamicSchema(colorSchema).optional(),
});

export type BadgeProps = z.infer<typeof badgePropsSchema>;

// ---------------------------------------------------------------------------
// 7. ChipProps
// ---------------------------------------------------------------------------

export const chipPropsSchema = z.object({
  label: dynamicSchema(z.string()),
  color: dynamicSchema(colorSchema).optional(),
});

export type ChipProps = z.infer<typeof chipPropsSchema>;

// ---------------------------------------------------------------------------
// 8. DividerProps
// ---------------------------------------------------------------------------

export const dividerPropsSchema = z.object({
  color: dynamicSchema(colorSchema).optional(),
  thickness: dynamicSchema(lengthSchema).optional(),
});

export type DividerProps = z.infer<typeof dividerPropsSchema>;

// ---------------------------------------------------------------------------
// 9. SpacerProps
// ---------------------------------------------------------------------------

export const spacerPropsSchema = z.object({
  size: dynamicSchema(lengthSchema).optional(),
});

export type SpacerProps = z.infer<typeof spacerPropsSchema>;

// ---------------------------------------------------------------------------
// 10. ButtonProps
// ---------------------------------------------------------------------------

export const buttonPropsSchema = z.object({
  label: dynamicSchema(z.string()),
  action: z.string(),
});

export type ButtonProps = z.infer<typeof buttonPropsSchema>;

// ---------------------------------------------------------------------------
// 11. ToggleProps
// ---------------------------------------------------------------------------

export const togglePropsSchema = z.object({
  value: dynamicSchema(z.boolean()),
  onToggle: z.string(),
});

export type ToggleProps = z.infer<typeof togglePropsSchema>;
