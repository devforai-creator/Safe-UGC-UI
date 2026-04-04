/**
 * Safe UGC UI — Card Spec (TypeScript, Current Behavior)
 *
 * Use this as the LLM-facing type guide. It matches the current card spec
 * (safe-ugc-ui-card-spec.md) and is intentionally strict.
 *
 * NOTE: Component fields live directly on the node (no `props` wrapper).
 */

// ---------------------------------------------------------------------------
// 1) Shared primitives
// ---------------------------------------------------------------------------

/** References a state value. Example: { "$ref": "$user.name" } */
export type Ref<T = unknown> = { $ref: RefPath };

/** $ref paths always start with "$" */
export type RefPath = `$${string}`;

/** Dynamic values allow literals or $ref (no $expr). */
export type Dynamic<T> = T | Ref<T>;

export type TemplatePart = string | number | boolean | null | Ref<unknown>;
export type TemplateValue = { $template: TemplatePart[] };
export type TextValue = string | Ref<string> | TemplateValue;

export type ConditionOperand = string | number | boolean | null | Ref<unknown>;

export type ComparisonCondition = {
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  left: ConditionOperand;
  right: ConditionOperand;
};

export type Condition =
  | boolean
  | Ref<boolean>
  | { op: 'not'; value: Condition }
  | { op: 'and'; values: Condition[] }
  | { op: 'or'; values: Condition[] }
  | ComparisonCondition;

/** Asset path must start with "@assets/". */
export type AssetPath = `@assets/${string}`;

/** Length values: single value only (no CSS shorthand). */
export type Length = number | string;

/** Color values: hex, rgb/rgba, hsl/hsla, or named colors. */
export type Color = string;

/** Width/height can additionally use the literal "auto". */
export type SizeValue = Length | 'auto';

// ---------------------------------------------------------------------------
// 2) Style types
// ---------------------------------------------------------------------------

export type DisplayValue = 'flex' | 'block' | 'none';
export type FlexDirectionValue = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type JustifyContentValue =
  | 'start'
  | 'flex-start'
  | 'center'
  | 'end'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type AlignItemsValue =
  | 'start'
  | 'flex-start'
  | 'center'
  | 'end'
  | 'flex-end'
  | 'stretch'
  | 'baseline';
export type AlignSelfValue =
  | 'auto'
  | 'start'
  | 'flex-start'
  | 'center'
  | 'end'
  | 'flex-end'
  | 'stretch';
export type FlexWrapValue = 'nowrap' | 'wrap' | 'wrap-reverse';
export type TextAlignValue = 'left' | 'center' | 'right' | 'justify';
export type TextDecorationValue = 'none' | 'underline' | 'line-through';
export type FontStyleValue = 'normal' | 'italic';
export type FontWeightValue =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;
export type PositionValue = 'static' | 'relative' | 'absolute';
export type OverflowValue = 'visible' | 'hidden' | 'auto';

export interface BorderObject {
  width: Dynamic<number>;
  style: Dynamic<'solid' | 'dashed' | 'dotted' | 'none'>;
  color: Dynamic<Color>;
}

export interface ShadowObject {
  offsetX: Dynamic<number>;
  offsetY: Dynamic<number>;
  blur?: Dynamic<number>;
  spread?: Dynamic<number>;
  color: Dynamic<Color>;
}

export interface TextShadowObject {
  offsetX: Dynamic<number>;
  offsetY: Dynamic<number>;
  blur?: Dynamic<number>;
  color: Dynamic<Color>;
}

export interface GradientStop {
  color: Dynamic<Color>;
  position: Dynamic<string>; // e.g. "0%", "100%"
}

export interface LinearGradient {
  type: 'linear';
  direction: Dynamic<string>; // e.g. "135deg"
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial';
  stops: GradientStop[];
}

export interface RepeatingLinearGradient {
  type: 'repeating-linear';
  direction: Dynamic<string>; // e.g. "180deg"
  stops: GradientStop[];
}

export type GradientObject = LinearGradient | RadialGradient | RepeatingLinearGradient;

export type ClipPathCircle = {
  type: 'circle';
  radius: Dynamic<Length>;
};

export type ClipPathEllipse = {
  type: 'ellipse';
  rx: Dynamic<Length>;
  ry: Dynamic<Length>;
};

export type ClipPathInset = {
  type: 'inset';
  top: Dynamic<Length>;
  right: Dynamic<Length>;
  bottom: Dynamic<Length>;
  left: Dynamic<Length>;
  round?: Dynamic<Length>;
};

export type ClipPath = ClipPathCircle | ClipPathEllipse | ClipPathInset;

export interface TransformObject {
  rotate?: Dynamic<string>; // e.g. "45deg"
  scale?: Dynamic<number>; // 0.1–1.5
  translateX?: Dynamic<number>; // -500–500
  translateY?: Dynamic<number>; // -500–500
}

export type EasingValue = 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface TransitionDef {
  property: string;
  duration: number; // 0–2000 ms
  easing?: EasingValue;
  delay?: number; // 0–1000 ms
}

export type TransitionField = TransitionDef | TransitionDef[];

/**
 * Style fields.
 *
 * Positioning and overflow controls stay literal-only.
 * Structured style objects must be object literals, but selected leaf fields
 * inside border/transform/boxShadow/backgroundGradient/clipPath may use $ref.
 */
export interface BaseStyle {
  // Layout — dynamic
  display?: Dynamic<DisplayValue>;
  flexDirection?: Dynamic<FlexDirectionValue>;
  justifyContent?: Dynamic<JustifyContentValue>;
  alignItems?: Dynamic<AlignItemsValue>;
  alignSelf?: Dynamic<AlignSelfValue>;
  flexWrap?: Dynamic<FlexWrapValue>;
  flex?: Dynamic<number>;
  gap?: Dynamic<Length>;

  // Sizing — dynamic
  width?: Dynamic<SizeValue>;
  height?: Dynamic<SizeValue>;
  aspectRatio?: Dynamic<number | string>;
  minWidth?: Dynamic<Length>; // percentage strings allowed, "auto" is not allowed
  maxWidth?: Dynamic<Length>; // percentage strings allowed, "auto" is not allowed
  minHeight?: Dynamic<Length>; // percentage strings allowed, "auto" is not allowed
  maxHeight?: Dynamic<Length>; // percentage strings allowed, "auto" is not allowed

  // Spacing — dynamic (single values only)
  padding?: Dynamic<Length>;
  paddingTop?: Dynamic<Length>;
  paddingRight?: Dynamic<Length>;
  paddingBottom?: Dynamic<Length>;
  paddingLeft?: Dynamic<Length>;
  margin?: Dynamic<Length | 'auto'>;
  marginTop?: Dynamic<Length | 'auto'>;
  marginRight?: Dynamic<Length | 'auto'>;
  marginBottom?: Dynamic<Length | 'auto'>;
  marginLeft?: Dynamic<Length | 'auto'>;

  // Color — dynamic
  backgroundColor?: Dynamic<Color>;
  color?: Dynamic<Color>;
  backdropBlur?: Dynamic<number>;

  // Typography — dynamic
  fontFamily?: Dynamic<'sans' | 'serif' | 'mono' | 'rounded' | 'display' | 'handwriting'>;
  fontSize?: Dynamic<Length>;
  fontWeight?: Dynamic<FontWeightValue>;
  fontStyle?: Dynamic<FontStyleValue>;
  textAlign?: Dynamic<TextAlignValue>;
  textDecoration?: Dynamic<TextDecorationValue>;
  lineHeight?: Dynamic<number | Length>;
  letterSpacing?: Dynamic<Length>;
  textShadow?: TextShadowObject | TextShadowObject[];

  // Border radius — dynamic
  borderRadius?: Dynamic<Length>;
  borderRadiusTopLeft?: Dynamic<Length>;
  borderRadiusTopRight?: Dynamic<Length>;
  borderRadiusBottomLeft?: Dynamic<Length>;
  borderRadiusBottomRight?: Dynamic<Length>;

  // Grid — dynamic
  gridTemplateColumns?: Dynamic<string>;
  gridTemplateRows?: Dynamic<string>;
  gridColumn?: Dynamic<string>;
  gridRow?: Dynamic<string>;

  // Image fit/position — dynamic
  objectFit?: Dynamic<'cover' | 'contain' | 'fill' | 'none' | 'scale-down'>;
  objectPosition?: Dynamic<string>;

  // Static-only (literal only)
  overflow?: OverflowValue;
  position?: PositionValue;
  top?: Length;
  right?: Length;
  bottom?: Length;
  left?: Length;
  zIndex?: number;

  // Structured style objects (object literal only, leaf fields may use $ref)
  transform?: TransformObject;
  border?: BorderObject;
  borderTop?: BorderObject;
  borderRight?: BorderObject;
  borderBottom?: BorderObject;
  borderLeft?: BorderObject;
  boxShadow?: ShadowObject | ShadowObject[];
  backgroundGradient?: GradientObject;
  clipPath?: ClipPath;

  // $style reference
  $style?: string;
}

/**
 * Hover style supports the same style fields as the base style, except:
 * - no nested hoverStyle
 * - objectFit/objectPosition are allowed
 */
export type HoverStyle = BaseStyle & {
  transition?: TransitionField;
};

export interface Style extends BaseStyle {
  hoverStyle?: HoverStyle;
  transition?: TransitionField;
}

export interface ResponsiveProps {
  medium?: Omit<Style, 'hoverStyle' | 'transition'>;
  compact?: Omit<Style, 'hoverStyle' | 'transition'>;
}

export interface TextSpanStyle {
  backgroundColor?: Dynamic<Color>;
  color?: Dynamic<Color>;
  fontFamily?: Dynamic<'sans' | 'serif' | 'mono' | 'rounded' | 'display' | 'handwriting'>;
  fontSize?: Dynamic<Length>;
  fontWeight?: Dynamic<FontWeightValue>;
  fontStyle?: Dynamic<FontStyleValue>;
  textDecoration?: Dynamic<TextDecorationValue>;
  letterSpacing?: Dynamic<Length>;
  textShadow?: TextShadowObject | TextShadowObject[];
}

export interface TextSpan {
  text: TextValue;
  style?: TextSpanStyle;
}

// ---------------------------------------------------------------------------
// 3) Component fields
// ---------------------------------------------------------------------------

export interface TextFields {
  content?: TextValue;
  spans?: TextSpan[];
  maxLines?: number;
  truncate?: 'ellipsis' | 'clip';
}

export interface ImageFields {
  src: Dynamic<AssetPath>; // no external URLs
  alt?: Dynamic<string>;
}

export interface ProgressBarFields {
  value: Dynamic<number>;
  max: Dynamic<number>;
  color?: Dynamic<Color>;
}

export interface AvatarFields {
  src: Dynamic<AssetPath>; // no external URLs
  size?: Dynamic<Length>;
}

export interface IconFields {
  name: Dynamic<string>;
  size?: Dynamic<Length>;
  color?: Dynamic<Color>;
}

export interface BadgeFields {
  label: TextValue;
  color?: Dynamic<Color>;
}

export interface ChipFields {
  label: TextValue;
  color?: Dynamic<Color>;
}

export interface DividerFields {
  color?: Dynamic<Color>;
  thickness?: Dynamic<Length>;
}

export interface SpacerFields {
  size?: Dynamic<Length>;
}

export interface ButtonFields {
  label: TextValue;
  action: string; // static only
  disabled?: Dynamic<boolean>;
}

export interface ToggleFields {
  value: Dynamic<boolean>;
  onToggle: string; // static only
  disabled?: Dynamic<boolean>;
}

export interface AccordionItem {
  id: string;
  label: TextValue;
  content: RenderableNode;
  disabled?: Dynamic<boolean>;
}

export interface AccordionFields {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
}

export interface TabsItem {
  id: string;
  label: TextValue;
  content: RenderableNode;
  disabled?: Dynamic<boolean>;
}

export interface TabsFields {
  tabs: TabsItem[];
  defaultTab?: string;
}

// ---------------------------------------------------------------------------
// 4) Nodes (discriminated union)
// ---------------------------------------------------------------------------

export interface BaseNode {
  $if?: Condition;
  style?: Style;
  responsive?: ResponsiveProps;
}

export interface LayoutNode extends BaseNode {
  children?: Children;
}

export interface BoxNode extends LayoutNode {
  type: 'Box';
}
export interface RowNode extends LayoutNode {
  type: 'Row';
}
export interface ColumnNode extends LayoutNode {
  type: 'Column';
}
export interface StackNode extends LayoutNode {
  type: 'Stack';
}
export interface GridNode extends LayoutNode {
  type: 'Grid';
}

export interface TextNode extends BaseNode, TextFields {
  type: 'Text';
}
export interface ImageNode extends BaseNode, ImageFields {
  type: 'Image';
}
export interface ProgressBarNode extends BaseNode, ProgressBarFields {
  type: 'ProgressBar';
}
export interface AvatarNode extends BaseNode, AvatarFields {
  type: 'Avatar';
}
export interface IconNode extends BaseNode, IconFields {
  type: 'Icon';
}
export interface BadgeNode extends BaseNode, BadgeFields {
  type: 'Badge';
}
export interface ChipNode extends BaseNode, ChipFields {
  type: 'Chip';
}
export interface DividerNode extends BaseNode, DividerFields {
  type: 'Divider';
}
export interface SpacerNode extends BaseNode, SpacerFields {
  type: 'Spacer';
}
export interface ButtonNode extends BaseNode, ButtonFields {
  type: 'Button';
}
export interface ToggleNode extends BaseNode, ToggleFields {
  type: 'Toggle';
}
export interface AccordionNode extends BaseNode, AccordionFields {
  type: 'Accordion';
}
export interface TabsNode extends BaseNode, TabsFields {
  type: 'Tabs';
}

export interface FragmentUseNode {
  $use: string;
  $if?: Condition;
}

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
  | AccordionNode
  | TabsNode;

export type RenderableNode = UGCNode | FragmentUseNode;

// ---------------------------------------------------------------------------
// 5) for...in loops
// ---------------------------------------------------------------------------

export interface ForLoop {
  for: string; // referenced as $item
  in: RefPath; // must resolve to an array
  template: RenderableNode;
}

export type Children = RenderableNode[] | ForLoop;

// ---------------------------------------------------------------------------
// 6) Card
// ---------------------------------------------------------------------------

export type StyleName = string; // /^[A-Za-z][A-Za-z0-9_-]*$/

export interface Card {
  meta: { name: string; version: string };
  assets?: Record<string, AssetPath>;
  state?: Record<string, unknown>;
  styles?: Record<StyleName, Style>;
  fragments?: Record<StyleName, UGCNode>;
  views: Record<string, RenderableNode>;
}
