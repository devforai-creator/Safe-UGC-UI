/**
 * Safe UGC UI — Card Spec (TypeScript, Phase 2)
 *
 * Use this as the LLM-facing type guide. It matches the current card spec
 * (safe-ugc-ui-card-spec.md) and is intentionally strict.
 *
 * NOTE: `$expr` is reserved and must not be used.
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

/** Asset path must start with "@assets/". */
export type AssetPath = `@assets/${string}`;

/** Length values: single value only (no CSS shorthand). */
export type Length = number | string;

/** Color values: hex, rgb/rgba, hsl/hsla, or named colors. */
export type Color = string;

// ---------------------------------------------------------------------------
// 2) Style types
// ---------------------------------------------------------------------------

export type DisplayValue = 'flex' | 'block' | 'none';
export type FlexDirectionValue = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type JustifyContentValue =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type AlignItemsValue = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type AlignSelfValue = 'auto' | 'start' | 'center' | 'end' | 'stretch';
export type FlexWrapValue = 'nowrap' | 'wrap' | 'wrap-reverse';
export type TextAlignValue = 'left' | 'center' | 'right' | 'justify';
export type TextDecorationValue = 'none' | 'underline' | 'line-through';
export type FontStyleValue = 'normal' | 'italic';
export type FontWeightValue = 'normal' | 'bold' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type PositionValue = 'static' | 'relative' | 'absolute';
export type OverflowValue = 'visible' | 'hidden' | 'auto';

export interface BorderObject {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  color: Color;
}

export interface ShadowObject {
  offsetX: number;
  offsetY: number;
  blur?: number;
  spread?: number;
  color: Color;
}

export interface GradientStop {
  color: Color;
  position: string; // e.g. "0%", "100%"
}

export interface LinearGradient {
  type: 'linear';
  direction: string; // e.g. "135deg"
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial';
  stops: GradientStop[];
}

export type GradientObject = LinearGradient | RadialGradient;

export interface TransformObject {
  rotate?: string; // e.g. "45deg"
  scale?: number; // 0.1–1.5
  translateX?: number; // -500–500
  translateY?: number; // -500–500
}

/**
 * Style props.
 *
 * Static-only properties must be **literal** (no $ref), and all nested fields
 * are also literal-only (e.g., borderLeft.color cannot be $ref).
 */
export interface Style {
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
  width?: Dynamic<Length | 'auto'>;
  height?: Dynamic<Length | 'auto'>;
  minWidth?: Dynamic<Length | string>;
  maxWidth?: Dynamic<Length | string>;
  minHeight?: Dynamic<Length | string>;
  maxHeight?: Dynamic<Length | string>;

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

  // Typography — dynamic
  fontSize?: Dynamic<Length>;
  fontWeight?: Dynamic<FontWeightValue>;
  fontStyle?: Dynamic<FontStyleValue>;
  textAlign?: Dynamic<TextAlignValue>;
  textDecoration?: Dynamic<TextDecorationValue>;
  lineHeight?: Dynamic<number | Length>;
  letterSpacing?: Dynamic<Length>;

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

  // Static-only (literal only)
  overflow?: OverflowValue;
  position?: PositionValue;
  top?: Length;
  right?: Length;
  bottom?: Length;
  left?: Length;
  zIndex?: number;
  transform?: TransformObject;
  border?: BorderObject;
  borderTop?: BorderObject;
  borderRight?: BorderObject;
  borderBottom?: BorderObject;
  borderLeft?: BorderObject;
  boxShadow?: ShadowObject | ShadowObject[];
  backgroundGradient?: GradientObject;

  // $style reference
  $style?: string;
}

// ---------------------------------------------------------------------------
// 3) Component props
// ---------------------------------------------------------------------------

export interface TextProps {
  content: Dynamic<string>;
}

export interface ImageProps {
  src: Dynamic<AssetPath>; // no $expr, no external URLs
  alt?: Dynamic<string>;
  /** NOTE: width/height exist in schema but are ignored by renderer. */
  width?: Dynamic<Length>;
  height?: Dynamic<Length>;
}

export interface ProgressBarProps {
  value: Dynamic<number>;
  max: Dynamic<number>;
  color?: Dynamic<Color>;
}

export interface AvatarProps {
  src: Dynamic<AssetPath>; // no $expr, no external URLs
  size?: Dynamic<Length>;
}

export interface IconProps {
  name: string; // static only
  size?: Dynamic<Length>;
  color?: Dynamic<Color>;
}

export interface BadgeProps {
  label: Dynamic<string>;
  color?: Dynamic<Color>;
}

export interface ChipProps {
  label: Dynamic<string>;
  color?: Dynamic<Color>;
}

export interface DividerProps {
  color?: Dynamic<Color>;
  thickness?: Dynamic<Length>;
}

export interface SpacerProps {
  size?: Dynamic<Length>;
}

export interface ButtonProps {
  label: Dynamic<string>;
  action: string; // static only
}

export interface ToggleProps {
  value: Dynamic<boolean>;
  onToggle: string; // static only
}

// ---------------------------------------------------------------------------
// 4) Nodes (discriminated union)
// ---------------------------------------------------------------------------

export interface BaseNode {
  style?: Style;
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

export interface TextNode extends BaseNode {
  type: 'Text';
  props: TextProps;
}
export interface ImageNode extends BaseNode {
  type: 'Image';
  props: ImageProps;
}
export interface ProgressBarNode extends BaseNode {
  type: 'ProgressBar';
  props: ProgressBarProps;
}
export interface AvatarNode extends BaseNode {
  type: 'Avatar';
  props: AvatarProps;
}
export interface IconNode extends BaseNode {
  type: 'Icon';
  props: IconProps;
}
export interface BadgeNode extends BaseNode {
  type: 'Badge';
  props: BadgeProps;
}
export interface ChipNode extends BaseNode {
  type: 'Chip';
  props: ChipProps;
}
export interface DividerNode extends BaseNode {
  type: 'Divider';
  props: DividerProps;
}
export interface SpacerNode extends BaseNode {
  type: 'Spacer';
  props: SpacerProps;
}
export interface ButtonNode extends BaseNode {
  type: 'Button';
  props: ButtonProps;
}
export interface ToggleNode extends BaseNode {
  type: 'Toggle';
  props: ToggleProps;
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
  | ToggleNode;

// ---------------------------------------------------------------------------
// 5) for...in loops
// ---------------------------------------------------------------------------

export interface ForLoop {
  for: string; // referenced as $item
  in: RefPath; // must resolve to an array
  template: UGCNode;
}

export type Children = UGCNode[] | ForLoop;

// ---------------------------------------------------------------------------
// 6) Card
// ---------------------------------------------------------------------------

export type StyleName = string; // /^[A-Za-z][A-Za-z0-9_-]*$/

export interface Card {
  meta: { name: string; version: string };
  assets?: Record<string, AssetPath>;
  state?: Record<string, unknown>;
  styles?: Record<StyleName, Style>;
  views: Record<string, UGCNode>;
}
