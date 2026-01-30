/**
 * @safe-ugc-ui/types — Value Type System
 *
 * Defines the core value types used throughout the Safe UGC UI framework.
 * Based on spec section 4.1: Ref, Expr, Dynamic, Static, and primitive value types.
 *
 * Naming convention:
 *   - Zod schema → `fooSchema`
 *   - Inferred TypeScript type → `Foo`
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. Ref — state variable reference
// ---------------------------------------------------------------------------

export const refSchema = z.object({
  $ref: z.string(),
});

export type Ref = z.infer<typeof refSchema>;

// ---------------------------------------------------------------------------
// 2. Expr — expression
// ---------------------------------------------------------------------------

export const exprSchema = z.object({
  $expr: z.string(),
});

export type Expr = z.infer<typeof exprSchema>;

// ---------------------------------------------------------------------------
// 3. AssetPath — local asset reference (`@assets/...`)
// ---------------------------------------------------------------------------

export const assetPathSchema = z.string().startsWith('@assets/');

export type AssetPath = `@assets/${string}`;

// ---------------------------------------------------------------------------
// 4. Color — hex, rgb, hsl, named colors (loose string for now)
// ---------------------------------------------------------------------------

export const colorSchema = z.string();

export type Color = z.infer<typeof colorSchema>;

// ---------------------------------------------------------------------------
// 5. Length — number | string (px, %, em, rem)
// ---------------------------------------------------------------------------

export const lengthSchema = z.union([z.number(), z.string()]);

export type Length = z.infer<typeof lengthSchema>;

// ---------------------------------------------------------------------------
// 6. Percentage — string like "50%"
// ---------------------------------------------------------------------------

export const percentageSchema = z.string();

export type Percentage = z.infer<typeof percentageSchema>;

// ---------------------------------------------------------------------------
// 7. IconName — string identifier for platform-provided icons
// ---------------------------------------------------------------------------

export const iconNameSchema = z.string();

export type IconName = z.infer<typeof iconNameSchema>;

// ---------------------------------------------------------------------------
// Helper generic types (TypeScript-only, no Zod)
// ---------------------------------------------------------------------------

/** A value that can be a literal T, a state Ref, or an Expr. */
export type Dynamic<T> = T | Ref | Expr;

/** A value that can be a literal T or a state Ref (expressions forbidden). */
export type RefOnly<T> = T | Ref;

/** A value that must be a static literal (no dynamic binding). */
export type Static<T> = T;

// ---------------------------------------------------------------------------
// Helper: dynamic / refOnly Zod schema builders
// ---------------------------------------------------------------------------

/**
 * Creates a Zod schema that accepts the given base schema OR a Ref OR an Expr.
 *
 * ```ts
 * const dynamicColor = dynamicSchema(colorSchema);
 * // accepts: "#ff0000" | { $ref: "$color" } | { $expr: "..." }
 * ```
 */
export function dynamicSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, refSchema, exprSchema]);
}

/**
 * Creates a Zod schema that accepts the given base schema OR a Ref
 * (expressions are forbidden).
 *
 * ```ts
 * const refOnlyAsset = refOnlySchema(assetPathSchema);
 * // accepts: "@assets/img.png" | { $ref: "$imgPath" }
 * ```
 */
export function refOnlySchema<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, refSchema]);
}

// ---------------------------------------------------------------------------
// Type guard functions (runtime)
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the value is a `Ref` object (`{ $ref: string }`).
 */
export function isRef(value: unknown): value is Ref {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$ref' in value &&
    typeof (value as Record<string, unknown>).$ref === 'string'
  );
}

/**
 * Returns `true` if the value is an `Expr` object (`{ $expr: string }`).
 */
export function isExpr(value: unknown): value is Expr {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$expr' in value &&
    typeof (value as Record<string, unknown>).$expr === 'string'
  );
}

/**
 * Returns `true` if the value is either a `Ref` or an `Expr`.
 */
export function isDynamic(value: unknown): boolean {
  return isRef(value) || isExpr(value);
}

/**
 * Returns `true` if the value is a valid `AssetPath` (starts with `@assets/`).
 */
export function isAssetPath(value: unknown): value is AssetPath {
  return typeof value === 'string' && value.startsWith('@assets/');
}
