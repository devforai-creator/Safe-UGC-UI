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

## 2) Components and Structural Nodes

Layout: `Box`, `Row`, `Column`, `Stack`, `Grid` (use `children`)
Content: `Text`, `Image`
Display: `ProgressBar`, `Avatar`, `Icon`, `Badge`, `Chip`, `Divider`, `Spacer`
Interaction: `Button`, `Toggle`, `Accordion`, `Tabs`
Structural: `Switch`
**All component fields are top-level** — do not use a `props` wrapper.

- `Stack` is the overlay container: absolute children are positioned relative to it.

## 3) Dynamic Values

- Use `$ref` only: `{ "$ref": "$stateKey" }`
- Use structured `$template` for safe string composition:
  `{ "$template": ["@", { "$ref": "$username" }, " · Lv.", { "$ref": "$level" }] }`
- Use node-level `$if` for conditional rendering. It accepts `true`, `false`, a boolean `$ref`, or a small condition object with `not`, `and`, `or`, `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.
- `Icon.name` may be a literal string or `$ref`
- `Image.src` / `Avatar.src` are **@assets only** (no external URLs)
- `Text.content`, `Text.spans[*].text`, `Badge.label`, `Chip.label`, `Button.label`, `Accordion.items[*].label`, and `Tabs.tabs[*].label` accept literal strings, `$ref`, or `$template`

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
  `transform.*`, `border*.*`, `boxShadow.*`, `backgroundGradient.direction`, `backgroundGradient.stops[*].*`, `clipPath.*`
- **Image fit/position props**: `objectFit` (`cover|contain|fill|none|scale-down`) and `objectPosition` (CSS object-position string) are allowed, including inside `hoverStyle`.
- **Aspect ratio**: `aspectRatio` accepts a positive number or a ratio string like `"16 / 9"`.
- **Responsive overrides**: use node-level `responsive.medium` for container widths up to `768px`, and `responsive.compact` for widths up to `480px`. Merge order is base style -> `medium` -> `compact`.
- **Responsive restrictions**: `hoverStyle` and `transition` are forbidden inside both `responsive.medium` and `responsive.compact`.
- **Backdrop blur**: `backdropBlur` accepts a number from `0` to `40` and maps to a safe blur radius.
- **Structured clipPath**: `clipPath` must be an object, not a raw CSS string. Supported shapes are `{ "type": "circle", "radius": ... }`, `{ "type": "ellipse", "rx": ..., "ry": ... }`, and `{ "type": "inset", "top": ..., "right": ..., "bottom": ..., "left": ..., "round"?: ... }`.
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

## 8) Fragment Reuse and Structural Switching

- Use top-level `fragments` to define reusable node subtrees.
- Use `{ "$use": "fragmentName" }` anywhere a node is allowed, including child arrays and loop templates.
- `$use` may include only optional `$if`.
- Fragment names are static strings.
- Fragments may not contain another `$use`.
- Use `Switch` when the structure changes by a bounded theme or state key.
- `Switch.value` accepts a literal string or `$ref`.
- `Switch.cases` maps static case names to renderable nodes or `$use`.
- `Switch.default` is optional; it renders when no case matches.
- `Switch` is structural only: do not add `style`, `responsive`, or `children` to it.
- All declared `Switch` branches count toward validator limits even if only one branch renders at runtime.

## 9) Interaction Details

- `Button.action` and `Toggle.onToggle` are static strings.
- `Button.disabled` and `Toggle.disabled` accept boolean or `$ref`.
- `Accordion.items[*]` needs `id`, `label`, and `content`.
- `Accordion.items[*].content` may use a normal node or `$use`.
- `Accordion.items[*].disabled` accepts boolean or `$ref`.
- `Accordion.defaultExpanded` is optional.
- Unless `allowMultiple: true`, `defaultExpanded` may include at most one id.
- Hidden accordion content still counts toward existing validator and runtime limits.
- `Tabs.tabs[*]` needs `id`, `label`, and `content`.
- `Tabs.tabs[*].content` may use a normal node or `$use`.
- `Tabs.tabs[*].disabled` accepts boolean or `$ref`.
- `Tabs.defaultTab` is optional and must match a declared tab id.
- Tabs support click plus arrow-key, `Home`, and `End` keyboard selection.
- Hidden tab panel content still counts toward existing validator and runtime limits.

## 10) Common Mistakes (Avoid)

1. `borderLeft` itself as `$ref` instead of using `$ref` inside `borderLeft.color`
2. `padding: "6px 8px"` (shorthand not allowed)
3. `Image.src` not starting with `@assets/`
4. Raw CSS `"transition": "height 0.6s ease"` instead of structured transition objects
5. Putting nested `hoverStyle` inside `hoverStyle`, or using `$style` anywhere inside `styles` definitions
6. Using malformed `aspectRatio` strings like `"wide"` instead of `"16 / 9"`
7. Putting both `content` and `spans` on the same `Text` node
8. Using raw placeholder strings like `"@{$username}"` instead of structured `$template`
9. Putting `$use` inside `fragments.*` or adding extra fields like `style` to a `$use` wrapper
10. Reusing the same `Accordion.items[*].id` twice, or referencing a missing `defaultExpanded` / `defaultTab` id
11. Using raw string `clipPath` or raw `backdropFilter` instead of structured `clipPath` or numeric `backdropBlur`
12. Putting `style` on `Switch` or using runtime-generated case names instead of static `cases` keys

---

If you need full rules, see `safe-ugc-ui-card-spec.md`.
