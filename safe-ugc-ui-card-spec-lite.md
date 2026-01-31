# Safe UGC UI — Card Spec (Lite, Phase 2)

Use this as the **quick guide** for LLM output. It is a strict subset of the full spec.

## 1) Minimal Card Shape
```json
{
  "meta": { "name": "card-name", "version": "1.0.0" },
  "assets": { "key": "@assets/file.png" },
  "state": { "key": "value" },
  "styles": { "styleName": { "fontSize": 14, "color": "#fff" } },
  "views": { "Main": { "type": "Box", "children": [ ... ] } }
}
```

## 2) Components (16 total)
Layout: `Box`, `Row`, `Column`, `Stack`, `Grid` (use `children`)
Content: `Text`, `Image`
Display: `ProgressBar`, `Avatar`, `Icon`, `Badge`, `Chip`, `Divider`, `Spacer`
Interaction: `Button`, `Toggle`
**All component fields are top-level** — do not use a `props` wrapper.

## 3) Dynamic Values
- Use `$ref` only: `{ "$ref": "$stateKey" }`
- `$expr` **must not be used** (reserved; not evaluated)
- `Icon.name` is **static only** (no `$ref`)
- `Image.src` / `Avatar.src` are **@assets only** (no external URLs, no `$expr`)

## 4) Style Rules (Core)
- Most style values allow literal or `$ref`.
- **Static-only style props** (literal only):  
  `position`, `top/right/bottom/left`, `zIndex`, `overflow`, `transform`,  
  `border*`, `boxShadow`, `backgroundGradient`  
  **All nested fields are also literal-only** (e.g., `borderLeft.color` cannot be `$ref`).
- **No CSS shorthand lengths**: use single values only.  
  ✅ `padding: 8` / `paddingLeft: 8`  
  ❌ `padding: "6px 8px"`
- **Forbidden CSS functions** anywhere in strings: `calc(`, `var(`, `url(`, `env(`, `expression(`

## 5) $style Reuse
```json
"styles": { "card": { "padding": 16, "borderRadius": 12 } }
...
"style": { "$style": "card", "marginBottom": 8 }
```
- Names: `/^[A-Za-z][A-Za-z0-9_-]*$/`
- Inline overrides win
- `$style` **not allowed inside** `styles` definitions

## 6) for...in Loops
```json
"children": { "for": "item", "in": "$items", "template": { ... } }
```
Inside template: `$item` and `$index`.  
`in` must resolve to an array (state or loop-local). `undefined` → empty render.

## 7) Common Mistakes (Avoid)
1) `Icon.name` with `$ref`  
2) `borderLeft.color` with `$ref`  
3) `padding: "6px 8px"` (shorthand not allowed)  
4) `fontWeight: "900"` (must be number 900)  
5) `Image.src` not starting with `@assets/`

---
If you need full rules, see `safe-ugc-ui-card-spec.md`.
