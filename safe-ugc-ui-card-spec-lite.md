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
- `Stack` is the overlay container: absolute children are positioned relative to it.

## 3) Dynamic Values
- Use `$ref` only: `{ "$ref": "$stateKey" }`
- `Icon.name` may be a literal string or `$ref`
- `Image.src` / `Avatar.src` are **@assets only** (no external URLs)

## 4) Style Rules (Core)
- Most style values allow literal or `$ref`.
- **Static-only style props** (literal only):  
  `position`, `top/right/bottom/left`, `zIndex`, `overflow`
- **Structured style objects** must stay object literals, but leaf values may use `$ref`:  
  `transform.*`, `border*.*`, `boxShadow.*`, `backgroundGradient.direction`, `backgroundGradient.stops[*].*`
- **Image fit/position props**: `objectFit` (`cover|contain|fill|none|scale-down`) and `objectPosition` (CSS object-position string) are allowed, including inside `hoverStyle`.
- **Alignment aliases**: `"start"` / `"end"` are preferred, but `"flex-start"` / `"flex-end"` are also accepted.
- **fontWeight**: accepts `"normal"`, `"bold"`, numeric values `100`–`900`, and numeric strings like `"900"`.
- **Hover effects**: `style.hoverStyle` is allowed on every component. It follows the same validation rules as `style`, cannot contain another `hoverStyle`, and may use `$style` with the same merge semantics as base `style`.
- **Transitions**: use structured objects only, for example
  `{ "transition": { "property": "height", "duration": 600, "easing": "ease" } }`.
  Raw CSS strings like `"height 0.6s ease"` are forbidden.
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
- `$style` **not allowed anywhere inside** `styles` definitions, including `hoverStyle`

## 6) for...in Loops
```json
"children": { "for": "item", "in": "$items", "template": { ... } }
```
Inside template: `$item` and `$index`.  
`in` must resolve to an array (state or loop-local). `undefined` → empty render.

## 7) Common Mistakes (Avoid)
1) `borderLeft` itself as `$ref` instead of using `$ref` inside `borderLeft.color`
2) `padding: "6px 8px"` (shorthand not allowed)  
3) `Image.src` not starting with `@assets/`
4) Raw CSS `"transition": "height 0.6s ease"` instead of structured transition objects
5) Putting nested `hoverStyle` inside `hoverStyle`, or using `$style` anywhere inside `styles` definitions

---
If you need full rules, see `safe-ugc-ui-card-spec.md`.
