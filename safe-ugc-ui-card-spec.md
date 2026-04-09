# Safe UGC UI — Card JSON Specification (Current Behavior)

You are generating a **Safe UGC UI card** — a JSON document that describes a UI layout rendered safely in a sandboxed environment. Follow this specification exactly.

---

## 1. Card Structure

A card is a JSON object with these top-level fields:

```json
{
  "meta": { "name": "my-card", "version": "1.0.0" },
  "state": { ... },
  "styles": { ... },
  "fragments": { ... },
  "views": {
    "Main": { ... }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `meta` | Yes | `name` (string) and `version` (string, e.g. `"1.0.0"`) |
| `assets` | No | Manifest of local assets used by the card (see below) |
| `state` | No | Key-value pairs for dynamic data binding |
| `styles` | No | Named style definitions for reuse via `$style` (see Section 3.17) |
| `fragments` | No | Named reusable node subtrees for `$use` references (see Section 4.6.1) |
| `views` | Yes | Named view definitions. Each value is a component tree or `$use` wrapper. Must have at least one view. |

### Assets

The `assets` field declares which local assets the card references. Each value must be an `@assets/` path. The platform provides the actual files or resolved URLs at render time — the card only declares which assets it needs.

```json
{
  "assets": {
    "avatar": "@assets/avatar.png",
    "bg": "@assets/background.jpg"
  }
}
```

**Rules:**
- Every value must start with `@assets/`
- No external or inline URLs (`https://`, `http://`, `//`, `data:`, `javascript:` are all rejected)
- No path traversal (`../`)
- The actual image files or final resolved URLs are provided by the platform at render time
- Final asset URL provenance, remote fetch policy, and allowed origins are host/platform responsibilities rather than card-authored behavior

---

## 2. Components

Eighteen rendered component types plus one structural selector are available, organized into layout/content-display, interaction, and structural groups.

### 2.1 Layout Components

Layout components contain `children` — either an array of child nodes / `$use` wrappers or a `for...in` loop object (see Section 4.6).

#### Box
General-purpose container. No default flex direction.

```json
{ "type": "Box", "style": { ... }, "children": [ ... ] }
```

#### Row
Horizontal layout (like `flexDirection: row`). Children are laid out left-to-right.

```json
{ "type": "Row", "style": { ... }, "children": [ ... ] }
```

#### Column
Vertical layout (like `flexDirection: column`). Children are laid out top-to-bottom.

```json
{ "type": "Column", "style": { ... }, "children": [ ... ] }
```

#### Stack
Overlay container that establishes a positioning context (`position: relative`) for direct children with `position: "absolute"`. Use it for layered layouts and overlays.

```json
{ "type": "Stack", "style": { ... }, "children": [ ... ] }
```

#### Grid
CSS Grid container. Use `gridTemplateColumns` and `gridTemplateRows` in style to define the grid tracks (see Section 3.16).

```json
{ "type": "Grid", "style": { "gridTemplateColumns": "1fr 1fr 1fr" }, "children": [ ... ] }
```

**All layout components** share these fields:

| Field | Required | Type |
|-------|----------|------|
| `type` | Yes | `"Box"` \| `"Row"` \| `"Column"` \| `"Stack"` \| `"Grid"` |
| `children` | No | Array of child nodes / `$use` wrappers, or a `for...in` loop object |
| `$if` | No | Condition object, boolean literal, or boolean `$ref` (see Section 4.7) |
| `style` | No | Style object (see Section 3) |
| `responsive` | No | Node-level breakpoint overrides (see Section 3.18) |

### 2.2 Content Components

Content components do not have `children`. Their fields live directly on the node.

#### Text
Displays text content.

```json
{
  "type": "Text",
  "content": {
    "$template": ["@", { "$ref": "$username" }, " · Lv.", { "$ref": "$level" }]
  },
  "maxLines": 2,
  "truncate": "ellipsis",
  "style": { "fontSize": 16, "color": "#ffffff" }
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `content` | Conditionally | string-like value | literal, $ref, or `$template` |
| `spans` | Conditionally | array of `{ text, style? }` | ordered inline spans |
| `maxLines` | No | integer `1`–`10` | literal only |
| `truncate` | No | `"ellipsis"` \| `"clip"` | literal only |

`Text` must define exactly one of `content` or `spans`.

`spans[*].text` accepts the same string-like value as `content`: a literal string, `$ref`, or structured `$template`.

`spans[*].style` is restricted to inline typography properties only:

- `backgroundColor`
- `color`
- `fontFamily`
- `fontSize`
- `fontWeight`
- `fontStyle`
- `textDecoration`
- `letterSpacing`
- `textShadow`

#### Image
Displays an image from local assets only.

```json
{
  "type": "Image",
   "src": "@assets/photo.png", "alt": "My photo" ,
  "style": { "width": 200, "borderRadius": 8 }
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `src` | Yes | AssetPath (`@assets/...`) | literal or $ref |
| `alt` | No | string | literal or $ref |

To control image dimensions, use `style.width` and `style.height` on the Image node. There are no `width` / `height` fields on Image nodes.

**Image src rules:**
- Must start with `@assets/`
- No external URLs — `https://`, `http://`, `//`, `data:`, `javascript:` are all forbidden
- No path traversal (`../`)

#### Avatar
Circular image, typically used for profile pictures. Follows the same `@assets/` rules as Image.

```json
{
  "type": "Avatar",
   "src": "@assets/avatar.png", "size": 56 
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `src` | Yes | AssetPath (`@assets/...`) | literal or $ref |
| `size` | No | length | literal or $ref |

#### Icon
Platform-provided icon. The icon name may be a literal string or a `$ref`.

```json
{
  "type": "Icon",
   "name": "heart", "size": 24, "color": "#ff0066" 
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `name` | Yes | string | literal or $ref |
| `size` | No | length | literal or $ref |
| `color` | No | color | literal or $ref |

#### Spacer
Empty spacing element. Useful for adding fixed gaps or pushing siblings apart.

```json
{ "type": "Spacer",  "size": 16  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `size` | No | length | literal or $ref |

#### Divider
Horizontal line separator.

```json
{ "type": "Divider",  "color": "#333", "thickness": 1  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `color` | No | color | literal or $ref |
| `thickness` | No | length | literal or $ref |

#### ProgressBar
Progress indicator, rendered as a filled bar.

```json
{
  "type": "ProgressBar",
   "value": { "$ref": "$hp" }, "max": { "$ref": "$maxHp" }, "color": "#00ff88" 
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `value` | Yes | number | literal or $ref |
| `max` | Yes | number | literal or $ref |
| `color` | No | color | literal or $ref |

#### Badge
Small label with a colored background. Good for status indicators, counts, or tags.

```json
{ "type": "Badge",  "label": "NEW", "color": "#ff0066"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `label` | Yes | string-like value | literal, $ref, or `$template` |
| `color` | No | color | literal or $ref |

#### Chip
Label with a border outline, similar to Badge but outlined rather than filled.

```json
{ "type": "Chip",  "label": "Hacker", "color": "#00f0ff"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `label` | Yes | string-like value | literal, $ref, or `$template` |
| `color` | No | color | literal or $ref |

### 2.3 Interaction Components

Interaction components use fields and may trigger host callbacks or renderer-owned local state.

#### Button
Triggers an action callback when pressed. The `action` string identifies which callback to invoke.

```json
{ "type": "Button",  "label": "Accept", "action": "onAccept"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `label` | Yes | string-like value | literal, $ref, or `$template` |
| `action` | Yes | string | static only |
| `disabled` | No | boolean | literal or $ref |

#### Toggle
Boolean toggle switch that triggers a callback when flipped.

```json
{ "type": "Toggle",  "value": { "$ref": "$darkMode" }, "onToggle": "onToggleDarkMode"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `value` | Yes | boolean | literal or $ref |
| `onToggle` | Yes | string | static only |
| `disabled` | No | boolean | literal or $ref |

#### Accordion
Renderer-owned collapsible section list. Item content is standard renderable card content, so it may use loops, `$if`, and `$use`.

```json
{
  "type": "Accordion",
  "defaultExpanded": ["profile"],
  "items": [
    {
      "id": "profile",
      "label": "Profile",
      "content": { "type": "Text", "content": "Pilot details" }
    },
    {
      "id": "inventory",
      "label": { "$template": ["Inventory ", 3] },
      "content": { "$use": "inventoryPanel" }
    }
  ]
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `items` | Yes | array | static structure only |
| `allowMultiple` | No | boolean | literal only |
| `defaultExpanded` | No | string[] | literal only |

Each `items[*]` entry must contain:

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `id` | Yes | string | static only |
| `label` | Yes | string-like value | literal, $ref, or `$template` |
| `content` | Yes | renderable node | static node or `$use` |
| `disabled` | No | boolean | literal or $ref |

Rules:

- `items` must contain at least 1 item
- item ids must be unique within the accordion
- `defaultExpanded` ids must exist in `items`
- unless `allowMultiple` is `true`, `defaultExpanded` may contain at most one id
- hidden accordion content still counts toward validator and runtime limits

#### Tabs
Renderer-owned tab list with local selected state. Tab content is standard renderable card content, so it may use loops, `$if`, and `$use`.

```json
{
  "type": "Tabs",
  "defaultTab": "stats",
  "tabs": [
    {
      "id": "stats",
      "label": "Stats",
      "content": { "type": "Text", "content": "Mission stats" }
    },
    {
      "id": "logs",
      "label": { "$template": ["Logs ", { "$ref": "$logCount" }] },
      "disabled": { "$ref": "$logsLocked" },
      "content": { "$use": "logsPanel" }
    }
  ]
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `tabs` | Yes | array | static structure only |
| `defaultTab` | No | string | literal only |

Each `tabs[*]` entry must contain:

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `id` | Yes | string | static only |
| `label` | Yes | string-like value | literal, $ref, or `$template` |
| `content` | Yes | renderable node | static node or `$use` |
| `disabled` | No | boolean | literal or $ref |

Rules:

- `tabs` must contain at least 1 item
- tab ids must be unique within the tabs node
- `defaultTab`, if present, must exist in `tabs`
- disabled tabs are non-interactive
- hidden tab content still counts toward validator and runtime limits

Keyboard behavior:

- `ArrowLeft` / `ArrowRight` move selection across enabled tabs
- `ArrowUp` / `ArrowDown` are treated the same as left/right
- `Home` selects the first enabled tab
- `End` selects the last enabled tab

### 2.4 Structural Selectors

Structural selectors choose which statically declared subtree should render. They do not render DOM and do not accept `style`, `responsive`, or `children` fields.

#### Switch
Selects one branch by string key. Use it when layout or framing changes by a bounded state value such as a theme, character, or mode.

```json
{
  "type": "Switch",
  "value": { "$ref": "$theme" },
  "cases": {
    "knight": { "$use": "knightFrame" },
    "villain": { "$use": "villainFrame" }
  },
  "default": { "$use": "defaultFrame" }
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `value` | Yes | string | literal or $ref |
| `cases` | Yes | object map | static structure only |
| `default` | No | renderable node | static node or `$use` |
| `$if` | No | condition | same as other nodes |

Rules:

- `cases` must contain at least 1 entry
- case names are static strings matching `/^[A-Za-z][A-Za-z0-9_-]*$/`
- each `cases[key]` value must be a renderable node or `$use`
- `default`, if present, must be a renderable node or `$use`
- all declared `Switch` branches count toward static validation limits even though runtime renders at most one branch

---

## 3. Style System

Every component accepts an optional `style` object. Every component may also include an optional node-level `responsive` object for container-width overrides (see Section 3.18). Most style values can be literal or `$ref` (see Section 4), but some properties remain **static-only** — they must be literal values, no `$ref`.

**Static-only style properties** (literal values only):
- `position`, `top`, `right`, `bottom`, `left`, `zIndex`
- `overflow`

**Structured style objects** must still be object literals, but selected leaf fields inside them may use `$ref`:
- `transform.rotate`, `transform.scale`, `transform.translateX`, `transform.translateY`
- `border*.width`, `border*.style`, `border*.color`
- `boxShadow.offsetX`, `boxShadow.offsetY`, `boxShadow.blur`, `boxShadow.spread`, `boxShadow.color`
- `textShadow.offsetX`, `textShadow.offsetY`, `textShadow.blur`, `textShadow.color`
- `backgroundGradient.direction`, `backgroundGradient.stops[].color`, `backgroundGradient.stops[].position`
- `clipPath.radius`, `clipPath.rx`, `clipPath.ry`, `clipPath.top`, `clipPath.right`, `clipPath.bottom`, `clipPath.left`, `clipPath.round`

Example: `borderLeft.color` may use `$ref`, but `borderLeft` itself cannot be a `$ref`.
The same rule applies to `clipPath`: the shape object must be literal, while its length leaf fields may use `$ref`.

All other style properties accept literal values or `$ref`.

### 3.1 Layout Properties

```json
{
  "display": "flex",
  "flexDirection": "row",
  "justifyContent": "center",
  "alignItems": "center",
  "alignSelf": "start",
  "flexWrap": "wrap",
  "flex": 1,
  "gap": 8
}
```

| Property | Values |
|----------|--------|
| `display` | `"flex"` \| `"block"` \| `"none"` |
| `flexDirection` | `"row"` \| `"column"` \| `"row-reverse"` \| `"column-reverse"` |
| `justifyContent` | `"start"` \| `"flex-start"` \| `"center"` \| `"end"` \| `"flex-end"` \| `"space-between"` \| `"space-around"` \| `"space-evenly"` |
| `alignItems` | `"start"` \| `"flex-start"` \| `"center"` \| `"end"` \| `"flex-end"` \| `"stretch"` \| `"baseline"` |
| `alignSelf` | `"auto"` \| `"start"` \| `"flex-start"` \| `"center"` \| `"end"` \| `"flex-end"` \| `"stretch"` |
| `flexWrap` | `"nowrap"` \| `"wrap"` \| `"wrap-reverse"` |
| `flex` | number |
| `gap` | number or length string |

`"start"` / `"end"` are preferred, but `"flex-start"` / `"flex-end"` are also accepted.

### 3.2 Sizing Properties

```json
{
  "width": 300,
  "height": "100%",
  "minWidth": 200,
  "maxWidth": "400px"
}
```

| Property | Values |
|----------|--------|
| `width`, `height` | number \| length string \| percentage string \| `"auto"` |
| `aspectRatio` | positive number \| ratio string like `"16 / 9"` |
| `minWidth`, `maxWidth` | number \| length string \| percentage string |
| `minHeight`, `maxHeight` | number \| length string \| percentage string |

Length values: bare number (treated as px), `"100px"`, `"50%"`, `"2em"`, `"1.5rem"`.
`aspectRatio` accepts a positive number or a ratio string with positive numeric parts.
Only `width` and `height` accept the literal `"auto"` in the sizing group.

### 3.3 Spacing Properties

```json
{
  "padding": 16,
  "paddingTop": 8,
  "margin": 12,
  "marginBottom": 24
}
```

| Property | Values |
|----------|--------|
| `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` | number or length string |
| `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft` | number or length string or `"auto"` |

### 3.4 Color Properties

```json
{
  "backgroundColor": "#1a1a2e",
  "color": "#ffffff"
}
```

Accepted color formats:
- Hex: `"#fff"`, `"#ff0000"`, `"#ff000080"`
- RGB: `"rgb(255, 0, 0)"`, `"rgba(255, 0, 0, 0.5)"`
- HSL: `"hsl(0, 100%, 50%)"`, `"hsla(0, 100%, 50%, 0.5)"`
- Named: `"red"`, `"blue"`, `"transparent"`, etc. (148 CSS named colors)

### 3.5 Typography Properties

```json
{
  "fontFamily": "handwriting",
  "fontSize": 16,
  "fontWeight": "bold",
  "fontStyle": "italic",
  "textAlign": "center",
  "textDecoration": "underline",
  "lineHeight": 1.5,
  "letterSpacing": 1
}
```

| Property | Values | Constraints |
|----------|--------|-------------|
| `fontFamily` | `"sans"` \| `"serif"` \| `"mono"` \| `"rounded"` \| `"display"` \| `"handwriting"` | mapped to renderer-provided safe font stacks |
| `fontSize` | number or length string | 8–72 px |
| `fontWeight` | `"normal"` \| `"bold"` \| `"100"`–`"900"` \| 100–900 (hundreds) | — |
| `fontStyle` | `"normal"` \| `"italic"` | — |
| `textAlign` | `"left"` \| `"center"` \| `"right"` \| `"justify"` | — |
| `textDecoration` | `"none"` \| `"underline"` \| `"line-through"` | — |
| `lineHeight` | number (multiplier) or length | — |
| `letterSpacing` | number or length string | -10–50 px |

### 3.6 Border & Radius

```json
{
  "borderRadius": 12,
  "border": { "width": 1, "style": "solid", "color": "#333" }
}
```

| Property | Values | Constraints |
|----------|--------|-------------|
| `borderRadius` | number or length string | max 9999 |
| `borderRadiusTopLeft` | number or length string | max 9999 |
| `borderRadiusTopRight` | number or length string | max 9999 |
| `borderRadiusBottomLeft` | number or length string | max 9999 |
| `borderRadiusBottomRight` | number or length string | max 9999 |
| `border` | BorderObject | — |
| `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | BorderObject | — |

**BorderObject:** `{ "width": number, "style": "solid"|"dashed"|"dotted"|"none", "color": string }`

**Directional borderRadius** lets you round individual corners:

```json
{
  "borderRadiusTopLeft": 16,
  "borderRadiusTopRight": 16,
  "borderRadiusBottomLeft": 0,
  "borderRadiusBottomRight": 0
}
```

Each directional borderRadius has the same max 9999 constraint as `borderRadius`.

### 3.7 Shadow

```json
{
  "boxShadow": {
    "offsetX": 0, "offsetY": 4, "blur": 12, "spread": 0,
    "color": "rgba(0,0,0,0.15)"
  },
  "textShadow": {
    "offsetX": 0, "offsetY": 1, "blur": 8,
    "color": "rgba(255,255,255,0.85)"
  }
}
```

Multiple shadows use an array. Max 5 shadows. Blur max 100, spread max 50.
`textShadow` uses the same object-or-array pattern, but has no `spread` field. Max 5 text shadows. Blur max 100.

### 3.8 Gradient

```json
{
  "backgroundGradient": {
    "type": "linear",
    "direction": "135deg",
    "stops": [
      { "color": "#1a1a2e", "position": "0%" },
      { "color": "#16213e", "position": "100%" }
    ]
  }
}
```

Types: `"linear"` (requires `direction`) or `"radial"`.
`"repeating-linear"` is also allowed and uses the same `direction` + `stops` shape as `"linear"`.

### 3.9 Transform

```json
{
  "transform": {
    "rotate": "45deg",
    "scale": 1.2,
    "translateX": 10,
    "translateY": -5
  }
}
```

| Field | Constraints |
|-------|-------------|
| `scale` | 0.1–1.5 |
| `translateX`, `translateY` | -500–500 |
| `rotate` | any valid deg string |

### 3.10 Image Fit Properties

These properties control how an image is sized and positioned within its container. They are most useful on `Image` nodes but can be applied to any component.

```json
{
  "type": "Image",
  "src": "@assets/photo.png",
  "style": {
    "width": "100%",
    "height": "25em",
    "objectFit": "cover",
    "objectPosition": "center 10%"
  }
}
```

| Property | Values | Dynamic |
|----------|--------|---------|
| `objectFit` | `"cover"` \| `"contain"` \| `"fill"` \| `"none"` \| `"scale-down"` | literal or $ref |
| `objectPosition` | string (CSS object-position value, e.g. `"center"`, `"top"`, `"50% 20%"`) | literal or $ref |

Both properties are allowed in `hoverStyle` and as `transition` targets. This enables effects like panning across a cropped image on hover:

```json
{
  "style": {
    "objectFit": "cover",
    "objectPosition": "center 10%",
    "hoverStyle": {
      "objectPosition": "center 5%"
    },
    "transition": [
      { "property": "objectPosition", "duration": 600, "easing": "ease" }
    ]
  }
}
```

### 3.11 Other Properties

| Property | Values | Constraints |
|----------|--------|-------------|
| `opacity` | number | 0–1 |
| `backdropBlur` | number | 0–40 |
| `overflow` | `"visible"` \| `"hidden"` \| `"auto"` | see overflow rules below |
| `position` | `"static"` \| `"relative"` \| `"absolute"` | `"absolute"` is allowed inside Stack only |
| `top`, `right`, `bottom`, `left` | number or length string | only meaningful with `position: "absolute"` |
| `zIndex` | number | 0–100 |

**Overflow rules:**
- Max 2 elements with `overflow: "auto"` per card
- Nested `overflow: "auto"` is forbidden — if a parent has `auto`, its descendants cannot also use `auto`

**Position rules:**
- `position: "absolute"` is only allowed on direct children of a `Stack` component
- Using `position: "absolute"` inside Box, Row, Column, or Grid is forbidden

**Backdrop blur rules:**
- `backdropBlur` accepts only numeric values
- Allowed range: `0–40`
- The renderer maps it to `backdrop-filter: blur(...)`
- Raw `backdropFilter` strings remain forbidden

**Structured `clipPath`:**

`clipPath` is allowed only in structured object form. Raw CSS clip-path strings are rejected.

Supported shapes:

| Shape | Fields |
|-------|--------|
| `circle` | `{ "type": "circle", "radius": Length }` |
| `ellipse` | `{ "type": "ellipse", "rx": Length, "ry": Length }` |
| `inset` | `{ "type": "inset", "top": Length, "right": Length, "bottom": Length, "left": Length, "round"?: Length }` |

`Length` follows the same safe single-value model used elsewhere in the style system: bare numbers, `"100px"`, `"50%"`, `"2em"`, `"1.5rem"`.

### 3.12 Forbidden Properties

These are **never allowed**: `backgroundImage`, `cursor`, `listStyleImage`, `content`, `filter`, `backdropFilter`, `mixBlendMode`, `animation`, `mask`.

> **Note:** The `transition` key is only allowed in the structured object form described in Section 3.14. Raw CSS transition strings are forbidden.
>
> **Note:** `clipPath` is only allowed in the structured object form described in Section 3.11. Raw CSS clip-path strings are forbidden.

### 3.13 Hover Style

Every component's `style` object can include a `hoverStyle` sub-object. When the user hovers over the component, the styles in `hoverStyle` are applied on top of the base styles.

```json
{
  "type": "Box",
  "style": {
    "height": "25em",
    "backgroundColor": "#1a1a2e",
    "hoverStyle": {
      "height": "44em",
      "backgroundColor": "#2a2a3e"
    }
  }
}
```

`hoverStyle` accepts the same style properties and validation rules as the base style, with these restrictions:

| Rule | Description |
|------|-------------|
| No nesting | `hoverStyle` cannot contain another `hoverStyle` |
| `$style` allowed | `$style` references are allowed inside `hoverStyle`, using the same trim-and-merge semantics as base `style` |
| No `$style` in `card.styles` | `card.styles` definitions cannot contain `$style` at the top level or inside `hoverStyle` |
| Same validation | Forbidden properties, value ranges, and color validation apply exactly as they do in the base style |

The renderer implements hover by swapping inline style objects on `onMouseEnter`/`onMouseLeave` and merging `hoverStyle` on top of the base style. No raw CSS `:hover` pseudo-class is used.

### 3.14 Transition

The `transition` field defines the CSS transition value for a style object. It accepts a single transition object or an array of transition objects.

It is most commonly placed on the base `style` to animate changes when `hoverStyle` is applied. Because `hoverStyle` accepts the same style fields, `transition` is also allowed inside `hoverStyle`; for predictable behavior, prefer declaring it on the base `style`.

```json
{
  "style": {
    "height": "25em",
    "hoverStyle": { "height": "44em" },
    "transition": { "property": "height", "duration": 600, "easing": "ease" }
  }
}
```

**Multiple transitions:**

```json
{
  "transition": [
    { "property": "height", "duration": 600, "easing": "ease" },
    { "property": "backgroundColor", "duration": 300 }
  ]
}
```

**TransitionDef fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `property` | Yes | string | CSS property to animate. Must be in the allowed list (see below). |
| `duration` | Yes | number | Duration in milliseconds. Range: 0–2000. |
| `easing` | No | string | Easing function. One of: `"ease"`, `"linear"`, `"ease-in"`, `"ease-out"`, `"ease-in-out"`. Default: `"ease"`. |
| `delay` | No | number | Delay in milliseconds before the transition starts. Range: 0–1000. |

**Constraints:**

| Resource | Limit |
|----------|-------|
| Max transition definitions per style | 10 |
| Duration range | 0–2000 ms |
| Delay range | 0–1000 ms |

**Allowed transition properties:**

`display`, `flexDirection`, `justifyContent`, `alignItems`, `alignSelf`, `flexWrap`, `flex`, `gap`, `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `backgroundColor`, `color`, `borderRadius`, `borderRadiusTopLeft`, `borderRadiusTopRight`, `borderRadiusBottomLeft`, `borderRadiusBottomRight`, `fontSize`, `fontWeight`, `fontStyle`, `textAlign`, `textDecoration`, `lineHeight`, `letterSpacing`, `opacity`, `overflow`, `position`, `top`, `right`, `bottom`, `left`, `zIndex`, `gridTemplateColumns`, `gridTemplateRows`, `gridColumn`, `gridRow`, `objectFit`, `objectPosition`, `textShadow`

Any property not in this list will be rejected by the validator.

This allowlist is a validator/runtime compatibility rule, not a guarantee that every property will interpolate smoothly in CSS. Some allowed properties may still switch discretely depending on browser behavior.

> **Important:** Raw CSS transition strings (e.g., `"transition": "height 0.6s ease"`) are forbidden. Always use the structured object format.

### 3.15 Forbidden CSS Functions

The following CSS functions are **rejected in any string style value**:

- `calc()` — use literal values instead
- `var()` — no CSS custom properties
- `url()` — no external resource loading
- `env()` — no environment variables
- `expression()` — no IE expressions

If any style string value contains these function prefixes, the card will fail validation.

### 3.16 Grid Style Properties

Grid-specific style properties are used on `Grid` containers and their children.

**On the Grid container:**

```json
{
  "type": "Grid",
  "style": {
    "gridTemplateColumns": "1fr 1fr 1fr",
    "gridTemplateRows": "auto 1fr"
  },
  "children": [ ... ]
}
```

**On Grid children** (to control placement):

```json
{
  "type": "Box",
  "style": {
    "gridColumn": "1 / 3",
    "gridRow": "1 / 2"
  }
}
```

| Property | Type | Dynamic |
|----------|------|---------|
| `gridTemplateColumns` | string | literal or $ref |
| `gridTemplateRows` | string | literal or $ref |
| `gridColumn` | string | literal or $ref |
| `gridRow` | string | literal or $ref |

All grid properties accept string values. Use standard CSS Grid track syntax (`"1fr 1fr"`, `"auto 1fr"`, `"repeat(3, 1fr)"`, etc.).

### 3.17 Style Reuse ($style)

Cards can define reusable named styles in the top-level `styles` field and reference them in any node via `$style` inside the `style` object.

**Defining styles:**

```json
{
  "styles": {
    "heading": { "fontSize": 24, "color": "#ffffff", "fontWeight": "bold" },
    "muted": { "fontSize": 12, "color": "#888888" }
  }
}
```

**Using styles:**

```json
{
  "views": {
    "Main": {
      "type": "Text",
       "content": "Title" ,
      "style": { "$style": "heading", "marginBottom": 8 }
    }
  }
}
```

In this example, the Text node receives all properties from the `heading` style, plus the inline `marginBottom: 8`.

**Rules:**
- Style names must match `/^[A-Za-z][A-Za-z0-9_-]*$/`
- Inline style properties override `$style` base values (inline wins)
- `$style` cannot be used inside `styles` definitions (no circular references)
- The merged result (base + inline) is validated against all style rules
- A `$style` reference must point to a name that exists in the card's `styles` section

### 3.18 Responsive Overrides

Nodes may include an optional `responsive` object. It contains breakpoint-specific style overrides that are merged on top of the node's base `style`.

Version 1 currently supports two breakpoints:

| Breakpoint | Activates When |
|------------|----------------|
| `medium` | The rendered card container is `768px` wide or narrower |
| `compact` | The rendered card container is `480px` wide or narrower |

```json
{
  "type": "Row",
  "style": {
    "width": "360px",
    "padding": 24,
    "gap": 16
  },
  "responsive": {
    "medium": {
      "padding": 16,
      "gap": 12
    },
    "compact": {
      "width": "100%",
      "padding": 12,
      "flexDirection": "column"
    }
  }
}
```

**Merge behavior:**

- The base `style` is resolved first, including any `$style` reference
- The active `responsive.medium` style is resolved next, including any `$style` reference
- The active `responsive.compact` style is resolved after that, including any `$style` reference
- Responsive overrides are merged **shallowly** on top of the base style in this order: base -> `medium` -> `compact`
- Structured values such as `transform`, `border`, `backgroundGradient`, `boxShadow`, and `textShadow` are replaced as whole values when overridden

**Rules:**

- `responsive` lives on the node, not inside `style`
- Only `medium` and `compact` are currently supported
- `responsive.medium` accepts the same style properties as the base style, plus optional `$style`
- `responsive.compact` accepts the same style properties as the base style, plus optional `$style`
- `hoverStyle` and `transition` are **not allowed** inside `responsive.medium` or `responsive.compact`
- The merged responsive override is validated with the same property allowlist, value ranges, and security rules as any other style object
- Base `hoverStyle` and base `transition` continue to work in compact mode unless the card is otherwise invalid

---

## 4. State Binding ($ref)

Use `state` to define data, and `$ref` to bind it into fields or style values.

### 4.1 Defining State

```json
{
  "state": {
    "username": "NETRUNNER_42",
    "level": 15,
    "hp": 87,
    "maxHp": 100,
    "bio": "Elite hacker since 2019.",
    "messages": [
      { "text": "Hello", "reactions": ["thumbsup", "heart"] },
      { "text": "World", "reactions": ["star"] }
    ]
  }
}
```

State values can be strings, numbers, booleans, arrays, or nested objects.

Card-authored `state` is untrusted input and participates in the same loop, style, security, and limit checks as the rest of the card.

If a host merges additional runtime state before rendering, the effective merged state is also treated as untrusted for `$ref` resolution, loop validation, style/security checks, and text/style limits.

### 4.2 Referencing State

Use `{ "$ref": "$variableName" }` in fields or style values:

```json
{
  "type": "Text",
   "content": { "$ref": "$username" } 
}
```

**Dot notation** for nested objects:
```json
{ "$ref": "$user.name" }
```

**Bracket notation** for arrays (digits only):
```json
{ "$ref": "$items[0].name" }
```

### 4.3 $ref Rules

- Always starts with `$`
- Max path depth: 5 levels
- Array index: digits only, max 9999
- If the referenced value doesn't exist, it resolves to empty/undefined
- If a host supplies runtime state overrides, `$ref` resolution and validation use the merged effective state
- Text and style budgets apply to resolved output using that effective merged state, not just authored literals

### 4.4 $ref in $style Context

When using `$style`, the referenced style object is resolved first, then any inline properties (including `$ref` values) are applied on top. The `$ref` inside individual style properties works the same as elsewhere.

```json
{
  "style": {
    "$style": "heading",
    "color": { "$ref": "$themeColor" }
  }
}
```

Here, `$themeColor` overrides whatever `color` was set in the `heading` style definition.

### 4.5 Structured Templates (`$template`)

Use `$template` for safe string composition without introducing a second expression language.

```json
{
  "$template": [
    "@",
    { "$ref": "$username" },
    " · Lv.",
    { "$ref": "$level" }
  ]
}
```

Allowed template part types:

- string literal
- number literal
- boolean literal
- `null`
- `$ref`

Output semantics:

- Each part resolves independently
- `undefined` parts become empty strings
- numbers, booleans, and `null` stringify with normal JavaScript string conversion
- the final result is a single string

`$template` is allowed in these fields:

- `Text.content`
- `Text.spans[*].text`
- `Badge.label`
- `Chip.label`
- `Button.label`
- `Accordion.items[*].label`
- `Tabs.tabs[*].label`

`$template` is **not** allowed in security-sensitive fields such as `Image.src`, `Avatar.src`, `Button.action`, or `Toggle.onToggle`.

### 4.6 For...in Loops

Children of a layout component can be a **for-loop object** instead of an array. This renders a template once for each element in a state array.

```json
{
  "type": "Column",
  "style": { "gap": 8 },
  "children": {
    "for": "item",
    "in": "$messages",
    "template": {
      "type": "Text",
       "content": { "$ref": "$item.text" } 
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `for` | Yes | Loop variable name (without `$`). Referenced as `$item` in the template. |
| `in` | Yes | State path to an array (starts with `$`). |
| `template` | Yes | A single node to render for each array element. |

Inside the template, `$item` (or whatever you named the loop variable) refers to the current element, and `$index` refers to the current iteration index (0-based).

**Loop constraints:**
- Max 1000 iterations per loop
- Max 2 levels of nested loops
- Loop source must resolve to an array from state or loop-local variables (undefined is soft-skipped with empty render; non-array triggers an error)
- All expanded nodes count toward the 10,000 node limit

### 4.6.1 Fragment Reuse (`fragments` / `$use`)

Cards may define reusable node subtrees at the top level:

```json
{
  "fragments": {
    "profileHeader": {
      "type": "Row",
      "children": [
        { "type": "Text", "content": "Pilot" },
        { "type": "Badge", "label": "READY" }
      ]
    }
  }
}
```

Use a fragment anywhere a normal node is accepted:

```json
{ "$use": "profileHeader" }
```

Optional wrapper condition:

```json
{ "$use": "vipNotice", "$if": { "$ref": "$isVip" } }
```

Rules:

- `fragments` is a map from fragment name to a single normal node subtree
- fragment names use the same identifier pattern as `styles`
- `$use` accepts only `$use` and optional `$if`
- `$use` names are static strings only
- `$use` is allowed in child arrays, view roots, and `for...in.template`
- fragments may not contain another `$use`
- expanded fragment nodes count toward the same node, text, style, overflow, and loop limits as inline nodes

### 4.6.2 Structural Switching (`Switch`)

`Switch` chooses one statically declared branch by string key:

```json
{
  "type": "Switch",
  "value": { "$ref": "$runtime.image.theme" },
  "cases": {
    "knight": { "$use": "KnightFrame" },
    "villain": { "$use": "VillainFrame" }
  },
  "default": { "$use": "DefaultFrame" }
}
```

Branch selection rules:

- `value` accepts a literal string or `$ref`
- `cases` is a static object whose keys are case names and whose values are renderable nodes
- if `value` resolves to a case key, that branch renders
- otherwise `default` renders when present; if no `default` is provided, nothing renders
- all `cases` and `default` branches are still validated statically
- all declared branches count toward validator limits even when a different branch is selected at runtime

### 4.7 Node-Level Conditions (`$if`)

Any node may include an optional `$if` field. If the condition resolves to `true`, the node renders.
If it resolves to `false`, `null`, or `undefined`, the node is skipped.

```json
{
  "type": "Badge",
  "$if": { "$ref": "$user.isVip" },
  "label": "VIP"
}
```

Supported condition forms:

- boolean literal: `true`, `false`
- boolean `$ref`: `{ "$ref": "$showBanner" }`
- unary: `{ "op": "not", "value": <condition> }`
- logical: `{ "op": "and"|"or", "values": [<condition>, ...] }`
- comparison:

```json
{ "op": "gt", "left": { "$ref": "$hp" }, "right": 0 }
```

Allowed comparison operators:

- `eq`, `ne`, `gt`, `gte`, `lt`, `lte`

Allowed comparison operands:

- string literal
- number literal
- boolean literal
- `null`
- `$ref`

Constraints:

- Max condition nesting depth: 5
- No arithmetic operators
- No string concatenation
- No user-authored code strings
- No general `$expr`

**Nested loop example:**

```json
{
  "children": {
    "for": "msg",
    "in": "$messages",
    "template": {
      "type": "Column",
      "children": [
        { "type": "Text",  "content": { "$ref": "$msg.text" }  },
        {
          "type": "Row",
          "children": {
            "for": "reaction",
            "in": "$msg.reactions",
            "template": {
              "type": "Text",
               "content": { "$ref": "$reaction" } 
            }
          }
        }
      ]
    }
  }
}
```

In this example, the outer loop iterates over `$messages`, and for each message, the inner loop iterates over that message's `reactions` array.

---

## 5. Constraints Summary

| Resource | Limit |
|----------|-------|
| Card JSON size | max 1 MB |
| Text content total | max 200 KB (sum of renderable text output after `$template` / `$ref` resolution for `Text.content`, `Text.spans[*].text`, `Badge.label`, `Chip.label`, `Button.label`, `Accordion.items[*].label`, and `Tabs.tabs[*].label` using the effective merged state) |
| Style objects total | max 100 KB (sum of effective style objects after `$style` merge and `$ref` resolution using the effective merged state, including responsive overrides) |
| Total node count | max 10,000 |
| Loop iterations | max 1000 per loop |
| Nested loops | max 2 levels |
| Stack nesting | max 3 levels |
| fontSize | 8–72 px |
| letterSpacing | -10–50 px |
| borderRadius | max 9999 |
| directional borderRadius | max 9999 each |
| opacity | 0–1 |
| zIndex | 0–100 |
| transform scale | 0.1–1.5 |
| transform translate | -500–500 |
| boxShadow count | max 5 |
| boxShadow blur | max 100 |
| boxShadow spread | max 50 |
| textShadow count | max 5 |
| textShadow blur | max 100 |
| overflow: auto count | max 2 per card, no nesting |
| transition definitions per style | max 10 |
| transition duration | 0–2000 ms |
| transition delay | 0–1000 ms |
| hoverStyle nesting | forbidden (no hoverStyle inside hoverStyle) |
| `$style` inside card.styles definitions | forbidden, including `hoverStyle.$style` |
| responsive breakpoints | `medium`, `compact` |
| medium breakpoint threshold | container width ≤ 768 px |
| compact breakpoint threshold | container width ≤ 480 px |
| `backdropBlur` | 0–40 |
| `hoverStyle` / `transition` inside `responsive.medium` / `responsive.compact` | forbidden |

---

### 5.1 Reference Renderer Isolation

The reference React renderer wraps card output in an isolated container with:

- `overflow: hidden`
- `isolation: isolate`
- `contain: content`
- `position: relative`

Host-provided container styling may extend that wrapper, but must not override those protection keys.

---

## 6. Common Patterns

### 6.1 Horizontal Row with Gap

```json
{
  "type": "Row",
  "style": { "gap": 12, "alignItems": "center" },
  "children": [
    { "type": "Text",  "content": "Label"  },
    { "type": "Text",  "content": "Value"  }
  ]
}
```

### 6.2 Card Container with Rounded Corners

```json
{
  "type": "Box",
  "style": {
    "backgroundColor": "#1a1a2e",
    "padding": 24,
    "borderRadius": 16,
    "width": "360px"
  },
  "children": [ ... ]
}
```

### 6.3 Stat Display (Label + Value Vertically)

```json
{
  "type": "Column",
  "style": { "alignItems": "center" },
  "children": [
    {
      "type": "Text",
       "content": { "$ref": "$level" } ,
      "style": { "fontSize": 18, "color": "#ffcc00" }
    },
    {
      "type": "Text",
       "content": "LEVEL" ,
      "style": { "fontSize": 10, "color": "#666" }
    }
  ]
}
```

### 6.4 Circle Shape

```json
{
  "type": "Box",
  "style": {
    "width": 48,
    "height": 48,
    "borderRadius": 9999,
    "backgroundColor": "#00f0ff"
  }
}
```

### 6.5 Divider Line

```json
{ "type": "Divider",  "color": "#333"  }
```

### 6.6 Chat Bubble (Other Person)

```json
{
  "type": "Row",
  "style": { "gap": 8, "alignItems": "start" },
  "children": [
    {
      "type": "Avatar",
       "src": "@assets/sender-avatar.png", "size": 36 
    },
    {
      "type": "Column",
      "style": { "gap": 4 },
      "children": [
        {
          "type": "Text",
           "content": { "$ref": "$senderName" } ,
          "style": { "fontSize": 11, "color": "#555" }
        },
        {
          "type": "Row",
          "style": { "gap": 4, "alignItems": "end" },
          "children": [
            {
              "type": "Box",
              "style": { "backgroundColor": "#ffffff", "padding": 10, "borderRadius": 12, "maxWidth": "220px" },
              "children": [
                {
                  "type": "Text",
                   "content": { "$ref": "$message" } ,
                  "style": { "fontSize": 13, "color": "#333", "lineHeight": 18 }
                }
              ]
            },
            {
              "type": "Text",
               "content": { "$ref": "$time" } ,
              "style": { "fontSize": 10, "color": "#8899aa" }
            }
          ]
        }
      ]
    }
  ]
}
```

### 6.7 Chat Bubble (My Message, Right-Aligned)

```json
{
  "type": "Row",
  "style": { "justifyContent": "end", "gap": 4, "alignItems": "end" },
  "children": [
    {
      "type": "Text",
       "content": { "$ref": "$myTime" } ,
      "style": { "fontSize": 10, "color": "#8899aa" }
    },
    {
      "type": "Box",
      "style": { "backgroundColor": "#fef01b", "padding": 10, "borderRadius": 12, "maxWidth": "220px" },
      "children": [
        {
          "type": "Text",
           "content": { "$ref": "$myMsg" } ,
          "style": { "fontSize": 13, "color": "#333", "lineHeight": 18 }
        }
      ]
    }
  ]
}
```

### 6.8 For-Loop List Rendering

Render a list of messages from state using a `for...in` loop:

```json
{
  "type": "Column",
  "style": { "gap": 8, "padding": 12 },
  "children": {
    "for": "msg",
    "in": "$messages",
    "template": {
      "type": "Row",
      "style": { "gap": 8, "alignItems": "center" },
      "children": [
        {
          "type": "Avatar",
           "src": { "$ref": "$msg.avatar" }, "size": 32 
        },
        {
          "type": "Column",
          "style": { "gap": 2 },
          "children": [
            {
              "type": "Text",
               "content": { "$ref": "$msg.sender" } ,
              "style": { "fontSize": 13, "fontWeight": "bold", "color": "#ffffff" }
            },
            {
              "type": "Text",
               "content": { "$ref": "$msg.text" } ,
              "style": { "fontSize": 12, "color": "#aaaaaa" }
            }
          ]
        }
      ]
    }
  }
}
```

### 6.9 Grid Layout

A 3-column grid of items:

```json
{
  "type": "Grid",
  "style": {
    "gridTemplateColumns": "1fr 1fr 1fr",
    "gap": 12,
    "padding": 16
  },
  "children": [
    {
      "type": "Box",
      "style": { "backgroundColor": "#1a1a2e", "padding": 16, "borderRadius": 8 },
      "children": [
        { "type": "Text",  "content": "Item 1" , "style": { "color": "#fff" } }
      ]
    },
    {
      "type": "Box",
      "style": { "backgroundColor": "#1a1a2e", "padding": 16, "borderRadius": 8 },
      "children": [
        { "type": "Text",  "content": "Item 2" , "style": { "color": "#fff" } }
      ]
    },
    {
      "type": "Box",
      "style": { "backgroundColor": "#1a1a2e", "padding": 16, "borderRadius": 8 },
      "children": [
        { "type": "Text",  "content": "Item 3" , "style": { "color": "#fff" } }
      ]
    }
  ]
}
```

### 6.10 Progress Indicator

```json
{
  "type": "Column",
  "style": { "gap": 4 },
  "children": [
    {
      "type": "Row",
      "style": { "justifyContent": "space-between" },
      "children": [
        { "type": "Text",  "content": "HP" , "style": { "fontSize": 12, "color": "#555570" } },
        { "type": "Text",  "content": { "$ref": "$hpLabel" } , "style": { "fontSize": 12, "color": "#00ff88" } }
      ]
    },
    {
      "type": "ProgressBar",
       "value": { "$ref": "$hp" }, "max": { "$ref": "$maxHp" }, "color": "#00ff88" 
    }
  ]
}
```

### 6.11 Styled Badge List

Using `$style` for consistent badge styling:

```json
{
  "styles": {
    "tagBadge": { "fontSize": 11, "color": "#ffffff" }
  },
  "views": {
    "Main": {
      "type": "Row",
      "style": { "gap": 8 },
      "children": [
        { "type": "Badge",  "label": "Hacker", "color": "#ff0066" , "style": { "$style": "tagBadge" } },
        { "type": "Badge",  "label": "Elite", "color": "#00f0ff" , "style": { "$style": "tagBadge" } },
        { "type": "Badge",  "label": "Verified", "color": "#00ff88" , "style": { "$style": "tagBadge" } }
      ]
    }
  }
}
```

---

## 7. Complete Example — Cyberpunk Profile Card

```json
{
  "meta": { "name": "cyberpunk-profile", "version": "2.0.0" },
  "state": {
    "username": "NETRUNNER_42",
    "title": "Elite Hacker",
    "level": "LV.42",
    "hp": 87,
    "maxHp": 100,
    "hpLabel": "87 / 100",
    "credits": "12,450 EC",
    "bio": "Jacking into the net since 2019. Specializing in ICE-breaking and data extraction.",
    "skills": [
      { "name": "ICE Breaker", "level": "MAX" },
      { "name": "Stealth", "level": "8" },
      { "name": "Decryption", "level": "6" }
    ]
  },
  "styles": {
    "statValue": { "fontSize": 18, "fontWeight": "bold" },
    "statLabel": { "fontSize": 10, "color": "#555570" },
    "skillText": { "fontSize": 13, "color": "#ccccdd" }
  },
  "views": {
    "Main": {
      "type": "Box",
      "style": {
        "backgroundColor": "#0a0a12",
        "padding": 24,
        "borderRadius": 16,
        "width": "360px"
      },
      "children": [
        {
          "type": "Row",
          "style": { "gap": 16, "alignItems": "center", "marginBottom": 16 },
          "children": [
            {
              "type": "Avatar",
               "src": "@assets/avatar.png", "size": 56 
            },
            {
              "type": "Column",
              "style": { "gap": 2 },
              "children": [
                {
                  "type": "Text",
                   "content": { "$ref": "$username" } ,
                  "style": { "fontSize": 20, "color": "#00f0ff" }
                },
                {
                  "type": "Text",
                   "content": { "$ref": "$title" } ,
                  "style": { "fontSize": 12, "color": "#ff00aa", "letterSpacing": 2 }
                }
              ]
            }
          ]
        },
        { "type": "Divider",  "color": "#1a1a2e"  },
        { "type": "Spacer",  "size": 16  },
        {
          "type": "Row",
          "style": { "justifyContent": "space-between", "marginBottom": 16 },
          "children": [
            {
              "type": "Column",
              "style": { "alignItems": "center" },
              "children": [
                {
                  "type": "Text",
                   "content": { "$ref": "$level" } ,
                  "style": { "$style": "statValue", "color": "#ffcc00" }
                },
                {
                  "type": "Text",
                   "content": "LEVEL" ,
                  "style": { "$style": "statLabel" }
                }
              ]
            },
            {
              "type": "Column",
              "style": { "alignItems": "center" },
              "children": [
                {
                  "type": "Text",
                   "content": { "$ref": "$hpLabel" } ,
                  "style": { "$style": "statValue", "color": "#00ff88" }
                },
                {
                  "type": "Text",
                   "content": "HP" ,
                  "style": { "$style": "statLabel" }
                }
              ]
            },
            {
              "type": "Column",
              "style": { "alignItems": "center" },
              "children": [
                {
                  "type": "Text",
                   "content": { "$ref": "$credits" } ,
                  "style": { "$style": "statValue", "color": "#ff6600" }
                },
                {
                  "type": "Text",
                   "content": "CREDITS" ,
                  "style": { "$style": "statLabel" }
                }
              ]
            }
          ]
        },
        {
          "type": "ProgressBar",
          
            "value": { "$ref": "$hp" },
            "max": { "$ref": "$maxHp" },
            "color": "#00ff88"
          ,
          "style": { "marginBottom": 16 }
        },
        {
          "type": "Box",
          "style": { "backgroundColor": "#12121f", "padding": 12, "borderRadius": 8, "marginBottom": 16 },
          "children": [
            {
              "type": "Text",
               "content": { "$ref": "$bio" } ,
              "style": { "fontSize": 12, "color": "#8888aa", "lineHeight": 18 }
            }
          ]
        },
        { "type": "Divider",  "color": "#1a1a2e"  },
        { "type": "Spacer",  "size": 12  },
        {
          "type": "Text",
           "content": "SKILLS" ,
          "style": { "$style": "statLabel", "marginBottom": 8, "letterSpacing": 2 }
        },
        {
          "type": "Column",
          "style": { "gap": 6 },
          "children": {
            "for": "skill",
            "in": "$skills",
            "template": {
              "type": "Row",
              "style": { "justifyContent": "space-between" },
              "children": [
                {
                  "type": "Text",
                   "content": { "$ref": "$skill.name" } ,
                  "style": { "$style": "skillText" }
                },
                {
                  "type": "Badge",
                   "label": { "$ref": "$skill.level" }, "color": "#00f0ff" 
                }
              ]
            }
          }
        }
      ]
    }
  }
}
```

---

## 8. Rules Checklist

Before outputting a card, verify:

**Structure:**
- [ ] `meta` has `name` and `version` (both strings)
- [ ] `views` has at least one view (usually `"Main"`)
- [ ] Each view root is a valid node or a `$use` wrapper
- [ ] `fragments`, if present, maps names to normal node subtrees

**Components:**
- [ ] Layout nodes (`Box`, `Row`, `Column`, `Stack`, `Grid`) use `children` (array of nodes / `$use`, or for-loop object)
- [ ] Content nodes (`Text`, `Image`, `Avatar`, `Icon`, `Spacer`, `Divider`, `ProgressBar`, `Badge`, `Chip`) use top-level fields (no `props` object)
- [ ] Interaction nodes (`Button`, `Toggle`, `Accordion`) use top-level fields (no `props` object)
- [ ] `Tabs` uses top-level fields (no `props` object)
- [ ] `Switch` uses only `type`, `value`, `cases`, optional `default`, and optional `$if`
- [ ] `Text` defines exactly one of `content` or `spans`
- [ ] `Text.maxLines`, if present, is between 1 and 10
- [ ] `Text.truncate`, if present, is `"ellipsis"` or `"clip"`
- [ ] `Image.src` starts with `@assets/` — no external URLs
- [ ] `Avatar.src` starts with `@assets/` — no external URLs
- [ ] `Icon.name` is a string literal or `$ref`
- [ ] `Button.action` and `Toggle.onToggle` are static strings
- [ ] `Button.disabled` and `Toggle.disabled` are boolean literals or `$ref`
- [ ] `Accordion.items[*]` defines `id`, `label`, and `content`
- [ ] `Accordion.items[*].id` values are unique
- [ ] `Accordion.defaultExpanded`, if present, refers only to declared item ids
- [ ] `Accordion.defaultExpanded` contains at most one id unless `allowMultiple` is `true`
- [ ] `Tabs.tabs[*]` defines `id`, `label`, and `content`
- [ ] `Tabs.tabs[*].id` values are unique
- [ ] `Tabs.defaultTab`, if present, refers only to declared tab ids
- [ ] `Switch.value` is a string literal or `$ref`
- [ ] `Switch.cases` contains at least one static case key matching `/^[A-Za-z][A-Za-z0-9_-]*$/`
- [ ] `Switch.cases[*]` and `Switch.default`, if present, are renderable nodes or `$use`

**Dynamic values:**
- [ ] Dynamic values use `$ref` or structured `$template` where allowed
- [ ] `$template` is used only in `Text.content`, `Text.spans[*].text`, `Badge.label`, `Chip.label`, `Button.label`, `Accordion.items[*].label`, or `Tabs.tabs[*].label`
- [ ] Node-level `$if` uses a boolean literal, boolean `$ref`, or a supported condition object
- [ ] `$use` names are static strings and resolve to an existing fragment
- [ ] `fragments.*` does not contain nested `$use`
- [ ] All declared `Switch` branches count toward static limits
- [ ] State values referenced by `$ref` exist in the `state` object

**Styles:**
- [ ] Alignment uses valid layout keywords (`"start"`, `"end"`, `"flex-start"`, `"flex-end"`, etc.)
- [ ] `fontSize` is between 8 and 72
- [ ] `opacity` is between 0 and 1
- [ ] No forbidden style properties (animation, filter, cursor, etc.)
- [ ] No forbidden CSS functions in style strings (calc, var, url, env, expression)
- [ ] All color values are valid (hex, rgb, hsl, or named color)
- [ ] `assets` values (if any) all start with `@assets/` and contain no `../`
- [ ] `position`, offsets, `overflow`, and `zIndex` use literal values (no `$ref`)
- [ ] Structured style objects are object literals; if dynamic values are needed, use `$ref` inside leaf fields like `borderLeft.color`
- [ ] `fontFamily` uses one of the allowed tokens
- [ ] `aspectRatio` uses a positive number or a ratio string like `"16 / 9"`
- [ ] No nested `overflow: "auto"` (parent and child both auto is forbidden)
- [ ] Grid properties use string values

**Hover & Transition:**
- [ ] `hoverStyle` is inside `style`, not at node level
- [ ] No nested `hoverStyle` (hoverStyle inside hoverStyle is forbidden)
- [ ] `$style` inside `hoverStyle` references a valid `styles` entry
- [ ] No `$style` anywhere inside `styles` definitions
- [ ] `responsive` is at node level, not inside `style`
- [ ] If `responsive` is used, only `responsive.medium` and/or `responsive.compact` are present
- [ ] `responsive.medium` and `responsive.compact` do not contain `hoverStyle` or `transition`
- [ ] `transition` uses structured object(s), not raw CSS strings
- [ ] `transition.property` is in the allowed property list
- [ ] `transition.duration` is 0–2000 ms
- [ ] `transition.delay` (if present) is 0–1000 ms
- [ ] Max 10 transition definitions per style

**Style reuse:**
- [ ] `$style` references exist in the card's `styles` section
- [ ] Style names match `/^[A-Za-z][A-Za-z0-9_-]*$/`
- [ ] No `$style` inside `styles` definitions (no circular references)

**Layout:**
- [ ] `Stack` is used for absolute positioning (not other containers)
- [ ] `position: "absolute"` only appears on direct children of `Stack`

**Loops:**
- [ ] `for...in` loop sources resolve to arrays (from state or loop-local variables)
- [ ] Loop variable names don't start with `$` in the `for` field
- [ ] Loop nesting does not exceed 2 levels
- [ ] Loop iterations stay within the 1000-per-loop limit
