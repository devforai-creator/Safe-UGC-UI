/**
 * @safe-ugc-ui/types — Primitives (Node Types)
 *
 * Defines the component tree structure using Zod schemas with z.lazy() for
 * recursive types. Based on spec section 2 (primitive list) and section 4.2
 * (component props).
 *
 * Node categories:
 *   - Layout:      Box, Row, Column, Stack, Grid  (have children)
 *   - Content:     Text, Image                     (have props, no children)
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
// 5. Content nodes — have props, no children
// ===========================================================================

// ---------------------------------------------------------------------------
// 5.1 TextNode
// ---------------------------------------------------------------------------

export const textNodeSchema = z.object({
  type: z.literal('Text'),
  props: textPropsSchema,
  ...baseFields,
});

export type TextNode = {
  type: 'Text';
  props: z.infer<typeof textPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 5.2 ImageNode
// ---------------------------------------------------------------------------

export const imageNodeSchema = z.object({
  type: z.literal('Image'),
  props: imagePropsSchema,
  ...baseFields,
});

export type ImageNode = {
  type: 'Image';
  props: z.infer<typeof imagePropsSchema>;
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
  props: progressBarPropsSchema,
  ...baseFields,
});

export type ProgressBarNode = {
  type: 'ProgressBar';
  props: z.infer<typeof progressBarPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.2 AvatarNode
// ---------------------------------------------------------------------------

export const avatarNodeSchema = z.object({
  type: z.literal('Avatar'),
  props: avatarPropsSchema,
  ...baseFields,
});

export type AvatarNode = {
  type: 'Avatar';
  props: z.infer<typeof avatarPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.3 IconNode
// ---------------------------------------------------------------------------

export const iconNodeSchema = z.object({
  type: z.literal('Icon'),
  props: iconPropsSchema,
  ...baseFields,
});

export type IconNode = {
  type: 'Icon';
  props: z.infer<typeof iconPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.4 BadgeNode
// ---------------------------------------------------------------------------

export const badgeNodeSchema = z.object({
  type: z.literal('Badge'),
  props: badgePropsSchema,
  ...baseFields,
});

export type BadgeNode = {
  type: 'Badge';
  props: z.infer<typeof badgePropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.5 ChipNode
// ---------------------------------------------------------------------------

export const chipNodeSchema = z.object({
  type: z.literal('Chip'),
  props: chipPropsSchema,
  ...baseFields,
});

export type ChipNode = {
  type: 'Chip';
  props: z.infer<typeof chipPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.6 DividerNode
// ---------------------------------------------------------------------------

export const dividerNodeSchema = z.object({
  type: z.literal('Divider'),
  props: dividerPropsSchema.optional(),
  ...baseFields,
});

export type DividerNode = {
  type: 'Divider';
  props?: z.infer<typeof dividerPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 6.7 SpacerNode
// ---------------------------------------------------------------------------

export const spacerNodeSchema = z.object({
  type: z.literal('Spacer'),
  props: spacerPropsSchema.optional(),
  ...baseFields,
});

export type SpacerNode = {
  type: 'Spacer';
  props?: z.infer<typeof spacerPropsSchema>;
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
  props: buttonPropsSchema,
  ...baseFields,
});

export type ButtonNode = {
  type: 'Button';
  props: z.infer<typeof buttonPropsSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  condition?: z.infer<typeof exprSchema>;
};

// ---------------------------------------------------------------------------
// 7.2 ToggleNode
// ---------------------------------------------------------------------------

export const toggleNodeSchema = z.object({
  type: z.literal('Toggle'),
  props: togglePropsSchema,
  ...baseFields,
});

export type ToggleNode = {
  type: 'Toggle';
  props: z.infer<typeof togglePropsSchema>;
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
