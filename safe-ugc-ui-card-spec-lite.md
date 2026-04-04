# Safe UGC UI — Card Spec (Lite, Current Behavior)

Use this as the **quick guide** for LLM output. It is a strict subset of the full spec.

## 1) Minimal Card Shape
```json
{
  "meta": { "name": "card-name", "version": "1.0.0" },
  "assets": { "key": "@assets/file.png" },
  "state": { "key": "value" },
  "styles": { "styleName": { "fontSize": 14, "color": "#fff" } },
  "fragments": { "header": { "type": "Row", "children": [ ... ] } },
  "views": { "Main": { "type": "Box", "children": [ ... ] } }
}
```

## 2) Components (17 total)
Layout: `Box`, `Row`, `Column`, `Stack`, `Grid` (use `children`)
Content: `Text`, `Image`
Display: `ProgressBar`, `Avatar`, `Icon`, `Badge`, `Chip`, `Divider`, `Spacer`
Interaction: `Button`, `Toggle`, `Accordion`
**All component fields are top-level** — do not use a `props` wrapper.
- `Stack` is the overlay container: absolute children are positioned relative to it.

## 3) Dynamic Values
- Use `$ref` only: `{ "$ref": "$stateKey" }`
- Use structured `$template` for safe string composition:
  `{ "$template": ["@", { "$ref": "$username" }, " · Lv.", { "$ref": "$level" }] }`
- Use node-level `$if` for conditional rendering. It accepts `true`, `false`, a boolean `$ref`, or a small condition object with `not`, `and`, `or`, `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.
- `Icon.name` may be a literal string or `$ref`
- `Image.src` / `Avatar.src` are **@assets only** (no external URLs)
- `Text.content`, `Text.spans[*].text`, `Badge.label`, `Chip.label`, `Button.label`, and `Accordion.items[*].label` accept literal strings, `$ref`, or `$template`

## 4) Text Authoring
- `Text` uses exactly one of `content` or `spans`.
- `spans` is an ordered array of `{ "text": ..., "style": ... }`.
- Span styles are typography-only: `color`, `backgroundColor`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `textDecoration`, `letterSpacing`, `textShadow`.
- `Text.maxLines` accepts integers `1`–`10`.
- `Text.truncate` may be `"ellipsis"` or `"clip"`.

## 5) Style Rules (Core)
- Most style values allow literal or `$ref`.
- **Static-only style props** (literal only):  
  `position`, `top/right/bottom/left`, `zIndex`, `overflow`
- **Structured style objects** must stay object literals, but leaf values may use `$ref`:  
  `transform.*`, `border*.*`, `boxShadow.*`, `backgroundGradient.direction`, `backgroundGradient.stops[*].*`
- **Image fit/position props**: `objectFit` (`cover|contain|fill|none|scale-down`) and `objectPosition` (CSS object-position string) are allowed, including inside `hoverStyle`.
- **Aspect ratio**: `aspectRatio` accepts a positive number or a ratio string like `"16 / 9"`.
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

## 6) $style Reuse
```json
"styles": { "card": { "padding": 16, "borderRadius": 12 } }
...
"style": { "$style": "card", "marginBottom": 8 }
```
- Names: `/^[A-Za-z][A-Za-z0-9_-]*$/`
- Inline overrides win
- `$style` **not allowed anywhere inside** `styles` definitions, including `hoverStyle`

## 7) for...in Loops
```json
"children": { "for": "item", "in": "$items", "template": { ... } }
```
Inside template: `$item` and `$index`.  
`in` must resolve to an array (state or loop-local). `undefined` → empty render.

## 8) Fragment Reuse
- Use top-level `fragments` to define reusable node subtrees.
- Use `{ "$use": "fragmentName" }` anywhere a node is allowed, including child arrays and loop templates.
- `$use` may include only optional `$if`.
- Fragment names are static strings.
- Fragments may not contain another `$use`.

## 9) Interaction Details
- `Button.action` and `Toggle.onToggle` are static strings.
- `Button.disabled` and `Toggle.disabled` accept boolean or `$ref`.
- `Accordion.items[*]` needs `id`, `label`, and `content`.
- `Accordion.items[*].content` may use a normal node or `$use`.
- `Accordion.items[*].disabled` accepts boolean or `$ref`.
- `Accordion.defaultExpanded` is optional.
- Unless `allowMultiple: true`, `defaultExpanded` may include at most one id.
- Hidden accordion content still counts toward existing validator and runtime limits.

## 10) Common Mistakes (Avoid)
1) `borderLeft` itself as `$ref` instead of using `$ref` inside `borderLeft.color`
2) `padding: "6px 8px"` (shorthand not allowed)  
3) `Image.src` not starting with `@assets/`
4) Raw CSS `"transition": "height 0.6s ease"` instead of structured transition objects
5) Putting nested `hoverStyle` inside `hoverStyle`, or using `$style` anywhere inside `styles` definitions
6) Using malformed `aspectRatio` strings like `"wide"` instead of `"16 / 9"`
7) Putting both `content` and `spans` on the same `Text` node
8) Using raw placeholder strings like `"@{$username}"` instead of structured `$template`
9) Putting `$use` inside `fragments.*` or adding extra fields like `style` to a `$use` wrapper
10) Reusing the same `Accordion.items[*].id` twice or referencing a missing `defaultExpanded` id

---
If you need full rules, see `safe-ugc-ui-card-spec.md`.
