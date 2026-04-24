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
 *   - Interaction: Button, Toggle, Accordion, Tabs
 *   - Structural:  Switch
 *
 * Naming convention:
 *   - Zod schema  -> `fooNodeSchema`
 *   - Inferred TS -> `FooNode`
 */

import { z } from 'zod';
import { MAX_INTERACTIVE_ITEMS } from './constants.js';
import { conditionSchema } from './conditions.js';
import { responsivePropsSchema, stylePropsSchema } from './styles.js';
import { dynamicSchema, refSchema, templatedStringSchema } from './values.js';
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

const switchCaseNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/;

// ===========================================================================
// 1. FragmentUseNode — reusable subtree reference
// ===========================================================================

export const fragmentUseNodeSchema = z
  .object({
    $use: z.string(),
    $if: conditionSchema.optional(),
  })
  .strict();

export type FragmentUseNode = {
  $use: string;
  $if?: z.infer<typeof conditionSchema>;
};

// ===========================================================================
// 2. ForLoop — iterative children
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
  in: refSchema.shape.$ref,
  template: z.lazy(() => renderableNodeSchema),
});

export type ForLoop = {
  for: string;
  in: string;
  template: RenderableNode;
};

// ===========================================================================
// 3. Children — array of nodes OR a for-loop
// ===========================================================================

const childrenSchema = z.union([z.array(z.lazy(() => renderableNodeSchema)), forLoopSchema]);

type Children = RenderableNode[] | ForLoop;

// ===========================================================================
// 4. Base node fields (shared by every node)
// ===========================================================================

const baseFields = {
  $if: conditionSchema.optional(),
  style: stylePropsSchema.optional(),
  responsive: responsivePropsSchema.optional(),
};

// ===========================================================================
// 5. Layout nodes — have children
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
  $if?: z.infer<typeof conditionSchema>;
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
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
  $if?: z.infer<typeof conditionSchema>;
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
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
  $if?: z.infer<typeof conditionSchema>;
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
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
  $if?: z.infer<typeof conditionSchema>;
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
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
  $if?: z.infer<typeof conditionSchema>;
  children?: Children;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
};

// ===========================================================================
// 6. Content nodes — have fields, no children
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
  };

// ===========================================================================
// 7. Display nodes
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
  };

// ===========================================================================
// 8. Interaction nodes
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
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
    $if?: z.infer<typeof conditionSchema>;
    style?: z.infer<typeof stylePropsSchema>;
    responsive?: z.infer<typeof responsivePropsSchema>;
  };

// ---------------------------------------------------------------------------
// 7.3 SwitchNode
// ---------------------------------------------------------------------------

export const switchNodeSchema = z
  .object({
    type: z.literal('Switch'),
    value: dynamicSchema(z.string().min(1)),
    cases: z.record(
      z
        .string()
        .regex(switchCaseNamePattern, 'Switch case names must match /^[A-Za-z][A-Za-z0-9_-]*$/.'),
      z.lazy(() => renderableNodeSchema),
    ),
    default: z.lazy(() => renderableNodeSchema).optional(),
    $if: conditionSchema.optional(),
  })
  .strict();

export type SwitchNode = {
  type: 'Switch';
  value: string | { $ref: string };
  cases: Record<string, RenderableNode>;
  default?: RenderableNode;
  $if?: z.infer<typeof conditionSchema>;
};

// ---------------------------------------------------------------------------
// 7.4 AccordionNode
// ---------------------------------------------------------------------------

const interactiveItemIdSchema = z.string().min(1).max(64);

export const accordionItemSchema: z.ZodType<{
  id: string;
  label: z.infer<typeof templatedStringSchema>;
  content: RenderableNode;
  disabled?: boolean | { $ref: string };
}> = z
  .object({
    id: interactiveItemIdSchema,
    label: templatedStringSchema,
    content: z.lazy(() => renderableNodeSchema),
    disabled: dynamicSchema(z.boolean()).optional(),
  })
  .strict();

export type AccordionItem = {
  id: string;
  label: z.infer<typeof templatedStringSchema>;
  content: RenderableNode;
  disabled?: boolean | { $ref: string };
};

export const tabsItemSchema: z.ZodType<{
  id: string;
  label: z.infer<typeof templatedStringSchema>;
  content: RenderableNode;
  disabled?: boolean | { $ref: string };
}> = z
  .object({
    id: interactiveItemIdSchema,
    label: templatedStringSchema,
    content: z.lazy(() => renderableNodeSchema),
    disabled: dynamicSchema(z.boolean()).optional(),
  })
  .strict();

export type TabsItem = {
  id: string;
  label: z.infer<typeof templatedStringSchema>;
  content: RenderableNode;
  disabled?: boolean | { $ref: string };
};

export const accordionNodeSchema = z.object({
  type: z.literal('Accordion'),
  items: z.array(accordionItemSchema).min(1).max(MAX_INTERACTIVE_ITEMS),
  allowMultiple: z.boolean().optional(),
  defaultExpanded: z.array(interactiveItemIdSchema).max(MAX_INTERACTIVE_ITEMS).optional(),
  ...baseFields,
});

export type AccordionNode = {
  type: 'Accordion';
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
} & {
  $if?: z.infer<typeof conditionSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
};

// ---------------------------------------------------------------------------
// 7.5 TabsNode
// ---------------------------------------------------------------------------

export const tabsNodeSchema = z.object({
  type: z.literal('Tabs'),
  tabs: z.array(tabsItemSchema).min(1).max(MAX_INTERACTIVE_ITEMS),
  defaultTab: interactiveItemIdSchema.optional(),
  ...baseFields,
});

export type TabsNode = {
  type: 'Tabs';
  tabs: TabsItem[];
  defaultTab?: string;
} & {
  $if?: z.infer<typeof conditionSchema>;
  style?: z.infer<typeof stylePropsSchema>;
  responsive?: z.infer<typeof responsivePropsSchema>;
};

// ===========================================================================
// 9. UGCNode — discriminated union of all node types
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
  | ToggleNode
  | SwitchNode
  | AccordionNode
  | TabsNode;

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
    switchNodeSchema,
    accordionNodeSchema,
    tabsNodeSchema,
  ]),
);

export type RenderableNode = UGCNode | FragmentUseNode;

export const renderableNodeSchema: z.ZodType<RenderableNode> = z.lazy(() =>
  z.union([ugcNodeSchema, fragmentUseNodeSchema]),
);

// ===========================================================================
// 10. Phase1Node — MVP subset (spec section 9, Phase 1)
// ===========================================================================

/**
 * Phase 1 MVP node types: Box, Row, Column, Text, Image.
 */
export type Phase1Node = BoxNode | RowNode | ColumnNode | TextNode | ImageNode;

export const phase1NodeSchema: z.ZodType<Phase1Node> = z.lazy(() =>
  z.discriminatedUnion('type', [
    boxNodeSchema,
    rowNodeSchema,
    columnNodeSchema,
    textNodeSchema,
    imageNodeSchema,
  ]),
);
