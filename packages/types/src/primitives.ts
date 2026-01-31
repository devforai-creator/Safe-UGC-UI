/**
 * @safe-ugc-ui/types — Primitives (Node Types)
 *
 * Defines the component tree structure using Zod schemas with z.lazy() for
 * recursive types. Based on spec section 2 (primitive list) and section 4.2
 * (component field rules).
 *
 * Node categories:
 *   - Layout:      Box, Row, Column, Stack, Grid  (have children)
 *   - Content:     Text, Image                     (have fields, no children)
 *   - Display:     ProgressBar, Avatar, Icon, Badge, Chip, Divider, Spacer
 *   - Interaction: Button, Toggle
 *
 * Naming convention:
 *   - Zod schema  -> `fooNodeSchema`
 *   - Inferred TS -> `FooNode`
 */

import { z } from 'zod';
import { exprSchema } from './values.js';
import { stylePropsSchema } from './styles.js';
import {
  textPropsSchema,
  imagePropsSchema,
  progressBarPropsSchema,
  avatarPropsSchema,
  iconPropsSchema,
  badgePropsSchema,
  chipPropsSchema,
  dividerPropsSchema,
  spacerPropsSchema,
  buttonPropsSchema,
  togglePropsSchema,
} from './props.js';

// ===========================================================================
// 1. ForLoop — iterative children
// ===========================================================================

/**
 * A for-loop that produces children by iterating over a state array.
 *
 * ```json
 * { "for": "msg", "in": "$messages", "template": { ... } }
 * ```
 *
 * The `template` field references UGCNode via z.lazy() since UGCNode is
 * defined later in this module.
 */
export const forLoopSchema = z.object({
  for: z.string(),
  in: z.string(),
  template: z.lazy(() => ugcNodeSchema),
});

export type ForLoop = {
  for: string;
  in: string;
  template: UGCNode;
};

// ===========================================================================
// 2. Children — array of nodes OR a for-loop
// ===========================================================================

const childrenSchema = z.union([
  z.array(z.lazy(() => ugcNodeSchema)),
  forLoopSchema,
]);

type Children = UGCNode[] | ForLoop;

// ===========================================================================
// 3. Base node fields (shared by every node)
// ===========================================================================

const baseFields = {
  style: stylePropsSchema.optional(),
  condition: exprSchema.optional(),
};

// ===========================================================================
// 4. Layout nodes — have children
// ===========================================================================

// ---------------------------------------------------------------------------
// 4.1 BoxNode
// ---------------------------------------------------------------------------

export const boxNodeSchema = z.object({
  type: z.literal('Box'),
  children: childrenSchema.optional(),
  ...baseFields,
});

export type BoxNode = {
  type: 'Box';
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 4.2 RowNode
// ---------------------------------------------------------------------------

export const rowNodeSchema = z.object({
  type: z.literal('Row'),
  children: childrenSchema.optional(),
  ...baseFields,
});

export type RowNode = {
  type: 'Row';
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 4.3 ColumnNode
// ---------------------------------------------------------------------------

export const columnNodeSchema = z.object({
  type: z.literal('Column'),
  children: childrenSchema.optional(),
  ...baseFields,
});

export type ColumnNode = {
  type: 'Column';
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 4.4 StackNode
// ---------------------------------------------------------------------------

export const stackNodeSchema = z.object({
  type: z.literal('Stack'),
  children: childrenSchema.optional(),
  ...baseFields,
});

export type StackNode = {
  type: 'Stack';
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 4.5 GridNode
// ---------------------------------------------------------------------------

export const gridNodeSchema = z.object({
  type: z.literal('Grid'),
  children: childrenSchema.optional(),
  ...baseFields,
});

export type GridNode = {
  type: 'Grid';
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ===========================================================================
// 5. Content nodes — have fields, no children
// ===========================================================================

// ---------------------------------------------------------------------------
// 5.1 TextNode
// ---------------------------------------------------------------------------

export const textNodeSchema = z.object({
  type: z.literal('Text'),
  ...textPropsSchema.shape,
  ...baseFields,
});

export type TextNode = {
  type: 'Text';
} & z.infer<typeof textPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 5.2 ImageNode
// ---------------------------------------------------------------------------

export const imageNodeSchema = z.object({
  type: z.literal('Image'),
  ...imagePropsSchema.shape,
  ...baseFields,
});

export type ImageNode = {
  type: 'Image';
} & z.infer<typeof imagePropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ===========================================================================
// 6. Display nodes
// ===========================================================================

// ---------------------------------------------------------------------------
// 6.1 ProgressBarNode
// ---------------------------------------------------------------------------

export const progressBarNodeSchema = z.object({
  type: z.literal('ProgressBar'),
  ...progressBarPropsSchema.shape,
  ...baseFields,
});

export type ProgressBarNode = {
  type: 'ProgressBar';
} & z.infer<typeof progressBarPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.2 AvatarNode
// ---------------------------------------------------------------------------

export const avatarNodeSchema = z.object({
  type: z.literal('Avatar'),
  ...avatarPropsSchema.shape,
  ...baseFields,
});

export type AvatarNode = {
  type: 'Avatar';
} & z.infer<typeof avatarPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.3 IconNode
// ---------------------------------------------------------------------------

export const iconNodeSchema = z.object({
  type: z.literal('Icon'),
  ...iconPropsSchema.shape,
  ...baseFields,
});

export type IconNode = {
  type: 'Icon';
} & z.infer<typeof iconPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.4 BadgeNode
// ---------------------------------------------------------------------------

export const badgeNodeSchema = z.object({
  type: z.literal('Badge'),
  ...badgePropsSchema.shape,
  ...baseFields,
});

export type BadgeNode = {
  type: 'Badge';
} & z.infer<typeof badgePropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.5 ChipNode
// ---------------------------------------------------------------------------

export const chipNodeSchema = z.object({
  type: z.literal('Chip'),
  ...chipPropsSchema.shape,
  ...baseFields,
});

export type ChipNode = {
  type: 'Chip';
} & z.infer<typeof chipPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.6 DividerNode
// ---------------------------------------------------------------------------

export const dividerNodeSchema = z.object({
  type: z.literal('Divider'),
  ...dividerPropsSchema.shape,
  ...baseFields,
});

export type DividerNode = {
  type: 'Divider';
} & z.infer<typeof dividerPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.7 SpacerNode
// ---------------------------------------------------------------------------

export const spacerNodeSchema = z.object({
  type: z.literal('Spacer'),
  ...spacerPropsSchema.shape,
  ...baseFields,
});

export type SpacerNode = {
  type: 'Spacer';
} & z.infer<typeof spacerPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ===========================================================================
// 7. Interaction nodes
// ===========================================================================

// ---------------------------------------------------------------------------
// 7.1 ButtonNode
// ---------------------------------------------------------------------------

export const buttonNodeSchema = z.object({
  type: z.literal('Button'),
  ...buttonPropsSchema.shape,
  ...baseFields,
});

export type ButtonNode = {
  type: 'Button';
} & z.infer<typeof buttonPropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 7.2 ToggleNode
// ---------------------------------------------------------------------------

export const toggleNodeSchema = z.object({
  type: z.literal('Toggle'),
  ...togglePropsSchema.shape,
  ...baseFields,
});

export type ToggleNode = {
  type: 'Toggle';
} & z.infer<typeof togglePropsSchema> & {
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ===========================================================================
// 8. UGCNode — discriminated union of all node types
// ===========================================================================

/**
 * Union of every node type. Recursive via z.lazy() so that layout nodes
 * can contain UGCNode children.
 */
export type UGCNode =
  | BoxNode
  | RowNode
  | ColumnNode
  | StackNode
  | GridNode
  | TextNode
  | ImageNode
  | ProgressBarNode
  | AvatarNode
  | IconNode
  | BadgeNode
  | ChipNode
  | DividerNode
  | SpacerNode
  | ButtonNode
  | ToggleNode;

export const ugcNodeSchema: z.ZodType<UGCNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    boxNodeSchema,
    rowNodeSchema,
    columnNodeSchema,
    stackNodeSchema,
    gridNodeSchema,
    textNodeSchema,
    imageNodeSchema,
    progressBarNodeSchema,
    avatarNodeSchema,
    iconNodeSchema,
    badgeNodeSchema,
    chipNodeSchema,
    dividerNodeSchema,
    spacerNodeSchema,
    buttonNodeSchema,
    toggleNodeSchema,
  ]),
);

// ===========================================================================
// 9. Phase1Node — MVP subset (spec section 9, Phase 1)
// ===========================================================================

/**
 * Phase 1 MVP node types: Box, Row, Column, Text, Image.
 */
export type Phase1Node =
  | BoxNode
  | RowNode
  | ColumnNode
  | TextNode
  | ImageNode;

export const phase1NodeSchema: z.ZodType<Phase1Node> = z.lazy(() =>
  z.discriminatedUnion('type', [
    boxNodeSchema,
    rowNodeSchema,
    columnNodeSchema,
    textNodeSchema,
    imageNodeSchema,
  ]),
);
