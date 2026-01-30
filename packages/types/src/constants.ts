/**
 * @safe-ugc-ui/types — Constants
 *
 * All numeric limit constants and enumerated value sets from the Safe UGC UI
 * spec sections 6.1–6.4, plus component type lists and security-related arrays
 * from sections 2 and 3.
 *
 * Pure TypeScript — no Zod dependency.
 */

// ---------------------------------------------------------------------------
// 6.1 Card-level limits
// ---------------------------------------------------------------------------

/** Maximum size of the entire card JSON document (1 MB). */
export const CARD_JSON_MAX_BYTES = 1_000_000;

/** Maximum combined size of all Text content strings (200 KB). */
export const TEXT_CONTENT_TOTAL_MAX_BYTES = 200_000;

/** Maximum combined size of all style objects (100 KB). */
export const STYLE_OBJECTS_TOTAL_MAX_BYTES = 100_000;

/** Maximum size of a single asset file (5 MB). */
export const ASSET_INDIVIDUAL_MAX_BYTES = 5_000_000;

/** Maximum total size of all assets combined (50 MB). */
export const ASSET_TOTAL_MAX_BYTES = 50_000_000;

// ---------------------------------------------------------------------------
// 6.2 Rendering limits
// ---------------------------------------------------------------------------

/** Maximum number of rendered DOM nodes. */
export const MAX_NODE_COUNT = 10_000;

/** Maximum iterations for a single `for...in` loop. */
export const MAX_LOOP_ITERATIONS = 1_000;

/** Maximum depth of nested loops. */
export const MAX_NESTED_LOOPS = 2;

/** Maximum number of elements with `overflow: auto` per card. */
export const MAX_OVERFLOW_AUTO_COUNT = 2;

/** Maximum depth of nested Stack components. */
export const MAX_STACK_NESTING = 3;

// ---------------------------------------------------------------------------
// 6.3 Expression limits
// ---------------------------------------------------------------------------

/** Maximum character length of an expression string. */
export const EXPR_MAX_LENGTH = 500;

/** Maximum number of tokens in a single expression. */
export const EXPR_MAX_TOKENS = 50;

/** Maximum nesting depth within an expression. */
export const EXPR_MAX_NESTING = 10;

/** Maximum nesting depth for if/then/else conditions. */
export const EXPR_MAX_CONDITION_NESTING = 3;

/** Maximum character length of a string literal inside an expression. */
export const EXPR_MAX_STRING_LITERAL = 1_000;

/** Maximum depth of variable reference paths (e.g. `$a.b.c.d.e`). */
export const EXPR_MAX_REF_DEPTH = 5;

/** Maximum allowed array index in variable references. */
export const EXPR_MAX_ARRAY_INDEX = 9_999;

// ---------------------------------------------------------------------------
// 6.4 Style limits
// ---------------------------------------------------------------------------

/** Minimum allowed z-index value. */
export const ZINDEX_MIN = 0;

/** Maximum allowed z-index value. */
export const ZINDEX_MAX = 100;

/** Minimum allowed transform scale factor. */
export const TRANSFORM_SCALE_MIN = 0.1;

/** Maximum allowed transform scale factor. */
export const TRANSFORM_SCALE_MAX = 1.5;

/** Minimum allowed translateX/Y value (px). */
export const TRANSFORM_TRANSLATE_MIN = -500;

/** Maximum allowed translateX/Y value (px). */
export const TRANSFORM_TRANSLATE_MAX = 500;

/** Minimum allowed font size (px). */
export const FONT_SIZE_MIN = 8;

/** Maximum allowed font size (px). */
export const FONT_SIZE_MAX = 72;

/** Maximum number of box-shadow entries. */
export const BOX_SHADOW_MAX_COUNT = 5;

/** Maximum blur radius for a box-shadow (px). */
export const BOX_SHADOW_BLUR_MAX = 100;

/** Maximum spread radius for a box-shadow (px). */
export const BOX_SHADOW_SPREAD_MAX = 50;

/** Maximum border-radius value (px). */
export const BORDER_RADIUS_MAX = 9999;

/** Minimum letter-spacing value (px). */
export const LETTER_SPACING_MIN = -10;

/** Maximum letter-spacing value (px). */
export const LETTER_SPACING_MAX = 50;

/** Minimum opacity value. */
export const OPACITY_MIN = 0;

/** Maximum opacity value. */
export const OPACITY_MAX = 1;

// ---------------------------------------------------------------------------
// Component type lists
// ---------------------------------------------------------------------------

/**
 * Phase 1 MVP component types (spec section 9, Phase 1).
 * Box, Row, Column, Text, Image.
 */
export const PHASE1_COMPONENT_TYPES = [
  'Box',
  'Row',
  'Column',
  'Text',
  'Image',
] as const;

/**
 * All 16 component types defined in spec section 2.
 *
 * Layout (2.1): Box, Row, Column, Stack, Grid, Spacer
 * Content (2.2): Text, Image, Icon, Divider
 * Display (2.3): ProgressBar, Badge, Avatar, Chip
 * Interaction (2.4): Button, Toggle
 */
export const ALL_COMPONENT_TYPES = [
  // 2.1 Layout
  'Box',
  'Row',
  'Column',
  'Stack',
  'Grid',
  'Spacer',
  // 2.2 Content
  'Text',
  'Image',
  'Icon',
  'Divider',
  // 2.3 Display
  'ProgressBar',
  'Badge',
  'Avatar',
  'Chip',
  // 2.4 Interaction (optional)
  'Button',
  'Toggle',
] as const;

// ---------------------------------------------------------------------------
// Security-related enumerated values
// ---------------------------------------------------------------------------

/**
 * CSS properties that are completely forbidden (spec section 3.8).
 *
 * - External resource loading: backgroundImage, cursor, listStyleImage, content
 * - Performance / deception: filter, backdropFilter, mixBlendMode
 * - Complex visual manipulation: animation, transition, clipPath, mask
 */
export const FORBIDDEN_STYLE_PROPERTIES = [
  'backgroundImage',
  'cursor',
  'listStyleImage',
  'content',
  'filter',
  'backdropFilter',
  'mixBlendMode',
  'animation',
  'transition',
  'clipPath',
  'mask',
] as const;

/**
 * Position values that are never allowed (spec section 3.3).
 */
export const FORBIDDEN_POSITION_VALUES = ['fixed', 'sticky'] as const;

/**
 * Allowed overflow values (spec section 3.2).
 * Note: `scroll` is forbidden to prevent scroll-jacking.
 */
export const ALLOWED_OVERFLOW_VALUES = ['visible', 'hidden', 'auto'] as const;

/**
 * CSS function prefixes that must be rejected in any string value
 * to prevent injection of dynamic CSS or external resource loading.
 */
export const DANGEROUS_CSS_FUNCTIONS = [
  'calc(',
  'var(',
  'url(',
  'env(',
  'expression(',
] as const;

/**
 * Object key path segments that indicate prototype pollution attempts.
 * Any property path containing these segments must be rejected.
 */
export const PROTOTYPE_POLLUTION_SEGMENTS = [
  '__proto__',
  'constructor',
  'prototype',
] as const;
