# Safe UGC UI — Card JSON Specification (Phase 2)

You are generating a **Safe UGC UI card** — a JSON document that describes a UI layout rendered safely in a sandboxed environment. Follow this specification exactly.

---

## 1. Card Structure

A card is a JSON object with these top-level fields:

```json
{
  "meta": { "name": "my-card", "version": "1.0.0" },
  "state": { ... },
  "styles": { ... },
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
| `styles` | No | Named style definitions for reuse via `$style` (see Section 3.14) |
| `views` | Yes | Named view definitions. Each value is a component tree (node). Must have at least one view. |

### Assets

The `assets` field declares which local assets the card references. Each value must be an `@assets/` path. The platform provides the actual files — the card only declares which assets it needs.

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
- The actual image files are provided by the platform at render time

---

## 2. Components

Sixteen component types are available, organized into three categories.

### 2.1 Layout Components

Layout components contain `children` — either an array of child nodes or a `for...in` loop object (see Section 4.5).

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
Vertical stacking container with `flexDirection: column`. Supports `position: "absolute"` on its direct children, making it useful for overlays and layered layouts.

```json
{ "type": "Stack", "style": { ... }, "children": [ ... ] }
```

#### Grid
CSS Grid container. Use `gridTemplateColumns` and `gridTemplateRows` in style to define the grid tracks (see Section 3.13).

```json
{ "type": "Grid", "style": { "gridTemplateColumns": "1fr 1fr 1fr" }, "children": [ ... ] }
```

**All layout components** share these fields:

| Field | Required | Type |
|-------|----------|------|
| `type` | Yes | `"Box"` \| `"Row"` \| `"Column"` \| `"Stack"` \| `"Grid"` |
| `children` | No | Array of child nodes, or a `for...in` loop object |
| `style` | No | Style object (see Section 3) |

### 2.2 Content Components

Content components do not have `children`. Their fields live directly on the node.

#### Text
Displays text content.

```json
{
  "type": "Text",
   "content": "Hello World" ,
  "style": { "fontSize": 16, "color": "#ffffff" }
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `content` | Yes | string | literal or $ref |

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
| `src` | Yes | AssetPath (`@assets/...`) | literal or $ref (no $expr) |
| `alt` | No | string | literal or $ref |

To control image dimensions, use `style.width` and `style.height` on the Image node. There are no `width` / `height` fields on Image nodes.

**Image src rules:**
- Must start with `@assets/`
- No external URLs — `https://`, `http://`, `//`, `data:`, `javascript:` are all forbidden
- No path traversal (`../`)
- `$expr` is forbidden for src (security)

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
| `src` | Yes | AssetPath (`@assets/...`) | literal or $ref (no $expr) |
| `size` | No | length | literal or $ref |

#### Icon
Platform-provided icon. The icon name must be a static string — no dynamic binding allowed.

```json
{
  "type": "Icon",
   "name": "heart", "size": 24, "color": "#ff0066" 
}
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `name` | Yes | string | static only (no $ref, no $expr) |
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
| `label` | Yes | string | literal or $ref |
| `color` | No | color | literal or $ref |

#### Chip
Label with a border outline, similar to Badge but outlined rather than filled.

```json
{ "type": "Chip",  "label": "Hacker", "color": "#00f0ff"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `label` | Yes | string | literal or $ref |
| `color` | No | color | literal or $ref |

### 2.3 Interaction Components

Interaction components use fields and trigger callbacks.

#### Button
Triggers an action callback when pressed. The `action` string identifies which callback to invoke.

```json
{ "type": "Button",  "label": "Accept", "action": "onAccept"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `label` | Yes | string | literal or $ref |
| `action` | Yes | string | static only |

#### Toggle
Boolean toggle switch that triggers a callback when flipped.

```json
{ "type": "Toggle",  "value": { "$ref": "$darkMode" }, "onToggle": "onToggleDarkMode"  }
```

| Field | Required | Type | Dynamic |
|------|----------|------|---------|
| `value` | Yes | boolean | literal or $ref |
| `onToggle` | Yes | string | static only |

---

## 3. Style System

Every component accepts an optional `style` object. Most style values can be literal or `$ref` (see Section 4), but some properties are **static-only** — they must be literal values, no `$ref` or `$expr`.

**Static-only style properties** (literal values only):
- `position`, `top`, `right`, `bottom`, `left`, `zIndex`
- `overflow`
- `transform`
- `border`, `borderTop`, `borderRight`, `borderBottom`, `borderLeft`
- `boxShadow`
- `backgroundGradient`

**Important:** For static-only object properties (e.g., `border*`, `boxShadow`, `backgroundGradient`), **all nested fields are also literal-only**.  
Example: `borderLeft.color` cannot use `$ref` or `$expr`.

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
| `justifyContent` | `"start"` \| `"center"` \| `"end"` \| `"space-between"` \| `"space-around"` \| `"space-evenly"` |
| `alignItems` | `"start"` \| `"center"` \| `"end"` \| `"stretch"` \| `"baseline"` |
| `alignSelf` | `"auto"` \| `"start"` \| `"center"` \| `"end"` \| `"stretch"` |
| `flexWrap` | `"nowrap"` \| `"wrap"` \| `"wrap-reverse"` |
| `flex` | number |
| `gap` | number or length string |

**IMPORTANT:** Use `"start"` and `"end"`, NOT `"flex-start"` or `"flex-end"`.

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
| `minWidth`, `maxWidth` | number \| length string \| percentage string \| `"auto"` |
| `minHeight`, `maxHeight` | number \| length string \| percentage string \| `"auto"` |

Length values: bare number (treated as px), `"100px"`, `"50%"`, `"2em"`, `"1.5rem"`.

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
| `fontSize` | number or length string | 8–72 px |
| `fontWeight` | `"normal"` \| `"bold"` \| 100–900 (hundreds) | — |
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
  }
}
```

Multiple shadows use an array. Max 5 shadows. Blur max 100, spread max 50.

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

### 3.10 Other Properties

| Property | Values | Constraints |
|----------|--------|-------------|
| `opacity` | number | 0–1 |
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

### 3.11 Forbidden Properties

These are **never allowed**: `backgroundImage`, `cursor`, `listStyleImage`, `content`, `filter`, `backdropFilter`, `mixBlendMode`, `animation`, `transition`, `clipPath`, `mask`.

### 3.12 Forbidden CSS Functions

The following CSS functions are **rejected in any string style value**:

- `calc()` — use literal values instead
- `var()` — no CSS custom properties
- `url()` — no external resource loading
- `env()` — no environment variables
- `expression()` — no IE expressions

If any style string value contains these function prefixes, the card will fail validation.

### 3.13 Grid Style Properties

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

### 3.14 Style Reuse ($style)

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

---

## 4. State Binding ($ref)

Use `state` to define data, and `$ref` to bind it into fields or style values.

> **Important:** `$expr` is reserved for future use and **must not be used**. The schema accepts `$expr` for forward compatibility, but the renderer does not evaluate it — any `$expr` value will render as empty. Always use `$ref` with pre-computed state values instead.

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

### 4.5 For...in Loops

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
| Text content total | max 200 KB (sum of all Text content strings) |
| Style objects total | max 100 KB (sum of all style objects) |
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
| overflow: auto count | max 2 per card, no nesting |

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
- [ ] Each view root is a valid node with a `type` field

**Components:**
- [ ] Layout nodes (`Box`, `Row`, `Column`, `Stack`, `Grid`) use `children` (array or for-loop object)
- [ ] Content nodes (`Text`, `Image`, `Avatar`, `Icon`, `Spacer`, `Divider`, `ProgressBar`, `Badge`, `Chip`) use top-level fields (no `props` object)
- [ ] Interaction nodes (`Button`, `Toggle`) use top-level fields (no `props` object)
- [ ] `Text.content` is present
- [ ] `Image.src` starts with `@assets/` — no external URLs
- [ ] `Avatar.src` starts with `@assets/` — no external URLs
- [ ] `Icon.name` is a static string (no $ref, no $expr)
- [ ] `Button.action` and `Toggle.onToggle` are static strings

**Dynamic values:**
- [ ] Dynamic values use `$ref` only (`$expr` is reserved for future use — do not use)
- [ ] State values referenced by `$ref` exist in the `state` object

**Styles:**
- [ ] Alignment uses `"start"` / `"end"`, NOT `"flex-start"` / `"flex-end"`
- [ ] `fontSize` is between 8 and 72
- [ ] `opacity` is between 0 and 1
- [ ] No forbidden style properties (animation, filter, cursor, etc.)
- [ ] No forbidden CSS functions in style strings (calc, var, url, env, expression)
- [ ] All color values are valid (hex, rgb, hsl, or named color)
- [ ] `assets` values (if any) all start with `@assets/` and contain no `../`
- [ ] Static-only style properties use literal values (no `$ref`/`$expr` on position, border, transform, etc., including nested fields like `borderLeft.color`)
- [ ] No nested `overflow: "auto"` (parent and child both auto is forbidden)
- [ ] Grid properties use string values

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
