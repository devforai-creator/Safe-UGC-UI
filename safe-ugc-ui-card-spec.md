# Safe UGC UI — Card JSON Specification (Phase 1)

You are generating a **Safe UGC UI card** — a JSON document that describes a UI layout rendered safely in a sandboxed environment. Follow this specification exactly.

---

## 1. Card Structure

A card is a JSON object with these top-level fields:

```json
{
  "meta": { "name": "my-card", "version": "1.0.0" },
  "state": { ... },
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
- No external URLs (`https://...`)
- No path traversal (`../`)
- The actual image files are provided by the platform at render time

---

## 2. Components (Phase 1)

Five component types are available:

### 2.1 Layout Components

Layout components contain `children` (an array of child nodes).

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

**All layout components** share these fields:

| Field | Required | Type |
|-------|----------|------|
| `type` | Yes | `"Box"` \| `"Row"` \| `"Column"` |
| `children` | No | Array of child nodes |
| `style` | No | Style object (see Section 3) |

### 2.2 Content Components

Content components have `props` instead of `children`.

#### Text
Displays text content.

```json
{
  "type": "Text",
  "props": { "content": "Hello World" },
  "style": { "fontSize": 16, "color": "#ffffff" }
}
```

| Prop | Required | Type | Dynamic |
|------|----------|------|---------|
| `content` | Yes | string | literal or $ref (Phase 1) |

> **Phase 1 note:** `$expr` is not yet evaluated at runtime and will render as empty. Use literal strings or `$ref` for dynamic values. `$expr` will be supported in Phase 2.

#### Image
Displays an image from local assets only.

```json
{
  "type": "Image",
  "props": { "src": "@assets/photo.png", "alt": "My photo" },
  "style": { "width": 200, "borderRadius": 8 }
}
```

| Prop | Required | Type | Dynamic |
|------|----------|------|---------|
| `src` | Yes | AssetPath (`@assets/...`) | literal or $ref (no $expr) |
| `alt` | No | string | literal or $ref (Phase 1) |

To control image dimensions, use `style.width` and `style.height` on the Image node.

**Image src rules:**
- Must start with `@assets/`
- No external URLs — `https://`, `http://`, `//`, `data:`, `javascript:` are all forbidden
- No path traversal (`../`)
- `$expr` is forbidden for src (security)

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
| `minWidth`, `maxWidth` | number \| length string \| percentage string |
| `minHeight`, `maxHeight` | number \| length string \| percentage string |

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
| `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft` | number or length string |

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
| `border` | BorderObject | — |
| `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | BorderObject | — |

**BorderObject:** `{ "width": number, "style": "solid"|"dashed"|"dotted"|"none", "color": string }`

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
| `position` | `"static"` \| `"relative"` | `"absolute"` only in Stack (not in Phase 1) |
| `zIndex` | number | 0–100 |

**Overflow rules:**
- Max 2 elements with `overflow: "auto"` per card
- Nested `overflow: "auto"` is forbidden — if a parent has `auto`, its descendants cannot also use `auto`

### 3.11 Forbidden Properties

These are **never allowed**: `backgroundImage`, `cursor`, `content`, `filter`, `backdropFilter`, `mixBlendMode`, `animation`, `transition`, `clipPath`, `mask`.

### 3.12 Forbidden CSS Functions

The following CSS functions are **rejected in any string style value**:

- `calc()` — use literal values instead
- `var()` — no CSS custom properties
- `url()` — no external resource loading
- `env()` — no environment variables
- `expression()` — no IE expressions

If any style string value contains these function prefixes, the card will fail validation.

---

## 4. State Binding ($ref)

Use `state` to define data, and `$ref` to bind it into props or style values.

> **Phase 1:** Only `$ref` is supported for dynamic values. `$expr` (expressions like `"if $hp < 20 then 'red' else 'green'"`) passes schema validation but is **not evaluated at runtime** — it will render as empty. Use `$ref` with pre-computed state values instead.

### 4.1 Defining State

```json
{
  "state": {
    "username": "NETRUNNER_42",
    "level": 15,
    "hp": 87,
    "maxHp": 100,
    "bio": "Elite hacker since 2019."
  }
}
```

State values can be strings, numbers, booleans, arrays, or nested objects.

### 4.2 Referencing State

Use `{ "$ref": "$variableName" }` in props or style values:

```json
{
  "type": "Text",
  "props": { "content": { "$ref": "$username" } }
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

---

## 5. Constraints Summary

| Resource | Limit |
|----------|-------|
| Card JSON size | max 1 MB |
| Text content total | max 200 KB (sum of all Text content strings) |
| Style objects total | max 100 KB (sum of all style objects) |
| Total node count | max 10,000 |
| fontSize | 8–72 px |
| letterSpacing | -10–50 px |
| borderRadius | max 9999 |
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
    { "type": "Text", "props": { "content": "Label" } },
    { "type": "Text", "props": { "content": "Value" } }
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
      "props": { "content": { "$ref": "$level" } },
      "style": { "fontSize": 18, "color": "#ffcc00" }
    },
    {
      "type": "Text",
      "props": { "content": "LEVEL" },
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
{
  "type": "Box",
  "style": { "height": 1, "backgroundColor": "#333" }
}
```

### 6.6 Chat Bubble (Other Person)

```json
{
  "type": "Row",
  "style": { "gap": 8, "alignItems": "start" },
  "children": [
    {
      "type": "Box",
      "style": { "width": 36, "height": 36, "borderRadius": 12, "backgroundColor": "#ff9eaa", "minWidth": 36 }
    },
    {
      "type": "Column",
      "style": { "gap": 4 },
      "children": [
        {
          "type": "Text",
          "props": { "content": { "$ref": "$senderName" } },
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
                  "props": { "content": { "$ref": "$message" } },
                  "style": { "fontSize": 13, "color": "#333", "lineHeight": 18 }
                }
              ]
            },
            {
              "type": "Text",
              "props": { "content": { "$ref": "$time" } },
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
      "props": { "content": { "$ref": "$myTime" } },
      "style": { "fontSize": 10, "color": "#8899aa" }
    },
    {
      "type": "Box",
      "style": { "backgroundColor": "#fef01b", "padding": 10, "borderRadius": 12, "maxWidth": "220px" },
      "children": [
        {
          "type": "Text",
          "props": { "content": { "$ref": "$myMsg" } },
          "style": { "fontSize": 13, "color": "#333", "lineHeight": 18 }
        }
      ]
    }
  ]
}
```

---

## 7. Complete Example — Cyberpunk Profile Card

```json
{
  "meta": { "name": "cyberpunk-profile", "version": "1.0.0" },
  "state": {
    "username": "NETRUNNER_42",
    "title": "Elite Hacker",
    "level": "LV.42",
    "hp": "87 / 100",
    "credits": "12,450 EC",
    "bio": "Jacking into the net since 2019. Specializing in ICE-breaking and data extraction."
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
              "type": "Box",
              "style": {
                "width": 56, "height": 56,
                "borderRadius": 9999,
                "backgroundColor": "#00f0ff",
                "opacity": 0.9
              }
            },
            {
              "type": "Column",
              "style": { "gap": 2 },
              "children": [
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$username" } },
                  "style": { "fontSize": 20, "color": "#00f0ff" }
                },
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$title" } },
                  "style": { "fontSize": 12, "color": "#ff00aa", "letterSpacing": 2 }
                }
              ]
            }
          ]
        },
        {
          "type": "Box",
          "style": { "height": 1, "backgroundColor": "#1a1a2e", "marginBottom": 16 }
        },
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
                  "props": { "content": { "$ref": "$level" } },
                  "style": { "fontSize": 18, "color": "#ffcc00" }
                },
                {
                  "type": "Text",
                  "props": { "content": "LEVEL" },
                  "style": { "fontSize": 10, "color": "#555570" }
                }
              ]
            },
            {
              "type": "Column",
              "style": { "alignItems": "center" },
              "children": [
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$hp" } },
                  "style": { "fontSize": 18, "color": "#00ff88" }
                },
                {
                  "type": "Text",
                  "props": { "content": "HP" },
                  "style": { "fontSize": 10, "color": "#555570" }
                }
              ]
            },
            {
              "type": "Column",
              "style": { "alignItems": "center" },
              "children": [
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$credits" } },
                  "style": { "fontSize": 18, "color": "#ff6600" }
                },
                {
                  "type": "Text",
                  "props": { "content": "CREDITS" },
                  "style": { "fontSize": 10, "color": "#555570" }
                }
              ]
            }
          ]
        },
        {
          "type": "Box",
          "style": { "backgroundColor": "#12121f", "padding": 12, "borderRadius": 8 },
          "children": [
            {
              "type": "Text",
              "props": { "content": { "$ref": "$bio" } },
              "style": { "fontSize": 12, "color": "#8888aa", "lineHeight": 18 }
            }
          ]
        }
      ]
    }
  }
}
```

---

## 8. Rules Checklist

Before outputting a card, verify:

- [ ] `meta` has `name` and `version` (both strings)
- [ ] `views` has at least one view (usually `"Main"`)
- [ ] Each view root is a valid node with a `type` field
- [ ] Layout nodes (`Box`, `Row`, `Column`) use `children` (array)
- [ ] Content nodes (`Text`, `Image`) use `props` (object)
- [ ] `Text.props.content` is present
- [ ] `Image.props.src` starts with `@assets/` — no external URLs
- [ ] Dynamic values use `$ref` only (not `$expr` — Phase 1 does not evaluate expressions)
- [ ] Alignment uses `"start"` / `"end"`, NOT `"flex-start"` / `"flex-end"`
- [ ] `fontSize` is between 8 and 72
- [ ] `opacity` is between 0 and 1
- [ ] No forbidden style properties (animation, filter, cursor, etc.)
- [ ] No forbidden CSS functions in style strings (calc, var, url, env, expression)
- [ ] All color values are valid (hex, rgb, hsl, or named color)
- [ ] `assets` values (if any) all start with `@assets/` and contain no `../`
- [ ] Static-only style properties use literal values (no `$ref`/`$expr` on position, border, transform, etc.)
- [ ] No nested `overflow: "auto"` (parent and child both auto is forbidden)
- [ ] State values referenced by `$ref` exist in the `state` object
