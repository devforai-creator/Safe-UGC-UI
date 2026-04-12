# Safe UGC UI

Safe UGC UI is a pnpm workspace for describing, validating, and rendering untrusted UI cards.
It combines a JSON card format, Zod-based types, JSON Schema generation, a security-focused
validator, and a React renderer that keeps user-provided UI inside a constrained container.

## Status

- Phase 2 plus the `v1.0` interactive container milestone are implemented.
- Published packages are currently `2.2.0`: `@safe-ugc-ui/types`, `@safe-ugc-ui/schema`, `@safe-ugc-ui/validator`, `@safe-ugc-ui/react`.
- The `v1.1` safe visual/layout pack is implemented on `main`.
- The style system includes font family tokens, text shadow, repeating linear gradients, `aspectRatio`, `backdropBlur`, structured `clipPath`, and node-level `responsive.medium` / `responsive.compact` overrides.
- Nodes support `$if` conditional rendering, structural `Switch` branching, and `Button` / `Toggle` support `disabled`.
- Text authoring supports structured `$template`, `Text.spans`, and `Text.maxLines` / `truncate`.
- Cards support top-level `fragments` and `$use` references for non-recursive subtree reuse.
- `Accordion` and `Tabs` are implemented as renderer-owned interactive containers.
- `packages/demo` is a private playground app used for local development.

## Packages

| Package                  | Purpose                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `@safe-ugc-ui/types`     | Zod schemas, inferred TypeScript types, constants, and shared ref-path helpers |
| `@safe-ugc-ui/schema`    | JSON Schema generation and the built `ugc-card.schema.json` artifact           |
| `@safe-ugc-ui/validator` | Structural, style, security, limit validation, and safe card loading           |
| `@safe-ugc-ui/react`     | `UGCRenderer`, `UGCContainer`, renderer internals, asset/style helpers         |
| `@safe-ugc-ui/demo`      | Vite-based playground for editing card JSON and previewing output              |

### Dependency graph

```text
types ─────┬── schema
           ├── validator
           └── react ──── validator
                 │
demo ────┬── react
         └── validator
```

## Install

Install only the package you need:

```bash
pnpm add @safe-ugc-ui/react
pnpm add @safe-ugc-ui/validator
pnpm add @safe-ugc-ui/schema
pnpm add @safe-ugc-ui/types
```

`@safe-ugc-ui/react` already depends on `@safe-ugc-ui/types` and `@safe-ugc-ui/validator`.

## Workspace Commands

- `pnpm build` — build all workspace packages
- `pnpm test` — run Vitest in workspace mode
- `pnpm test:clean-checkout` — verify the demo typechecks and builds from a clean workspace without prebuilt package `dist` outputs
- `pnpm test:contracts` — run the targeted contract-regression gate for validator/renderer boundary bugs
- `pnpm test:run` — run the full workspace test suite once
- `pnpm test:coverage` — run the workspace suite with coverage
- `pnpm clean` — remove package `dist` directories
- `pnpm format` — format the workspace with Prettier
- `pnpm format:check` — check whether the workspace is Prettier-formatted

The main CI workflow also runs `pnpm format:check`.

## Quick Start

### Load a card safely

Use `loadCardRaw()` when the input is still a JSON string so the validator can reject oversized
payloads before parsing, run the full validation pipeline, and return a typed card only on success:

```ts
import { loadCardRaw } from '@safe-ugc-ui/validator';

const rawCard = `{
  "meta": { "name": "hello", "version": "1.0.0" },
  "state": { "greeting": "Hello, World!" },
  "views": {
    "Main": {
      "type": "Text",
      "content": { "$ref": "$greeting" }
    }
  }
}`;

const result = loadCardRaw(rawCard);

if (!result.valid) {
  console.error(result.errors);
} else {
  console.log(result.card.views.Main);
}
```

If the card is already parsed, use `loadCard()` instead.

Use `validateRaw()` or `validate()` when you only need diagnostics and do not need the typed
`UGCCard` returned.

For most validator errors, `ValidationError.path` points to the exact failing field. For some
structural `SCHEMA_ERROR`s that come from nested Zod unions, `path` points to the nearest stable
ancestor and `message` includes up to three deeper child locations.

### Render a card in React

Prefer validating at host ingest time with `loadCardRaw()` or `loadCard()`. `UGCRenderer` still
validates before rendering and revalidates the effective merged runtime state, so the render
boundary stays defensive even when the host passes a parsed card object.

```tsx
import { UGCRenderer } from '@safe-ugc-ui/react';
import { loadCardRaw } from '@safe-ugc-ui/validator';

export function CardPreview({ rawCard }: { rawCard: string }) {
  const result = loadCardRaw(rawCard);
  if (!result.valid) {
    console.error(result.errors);
    return null;
  }

  return (
    <UGCRenderer
      card={result.card}
      assets={{
        '@assets/avatar.png': 'https://cdn.example.com/avatar.png',
      }}
      onError={(errors) => {
        console.error(errors);
      }}
    />
  );
}
```

Key renderer props:

- `viewName` to render a specific named view
- `assets` to resolve `@assets/...` references to host-controlled URLs; the host owns final URL provenance and any origin allowlist policy
- `state` to override or extend `card.state`; the merged state is revalidated before rendering
- `containerStyle` to style the outer isolation container without replacing protected isolation properties
- `iconResolver` to map icon names to React nodes
- `onAction` to receive Button and Toggle action events

### Generate JSON Schema

For editor integration or external structural validation:

```ts
import { generateCardSchema } from '@safe-ugc-ui/schema';

const schema = generateCardSchema();
```

The build also emits a static file at `packages/schema/dist/ugc-card.schema.json`, published as:

```text
@safe-ugc-ui/schema/ugc-card.schema.json
```

## Card Model

A card is a JSON object with these main areas:

- `meta`: card identity and version metadata
- `assets`: named asset references that must use `@assets/...`; the host provides the final file or URL mapping
- `state`: precomputed values referenced via `{ "$ref": "$path.to.value" }`
- `styles`: named style presets for `$style` reuse
- `fragments`: reusable node subtrees referenced via `$use`
- `views`: one or more renderable trees

Currently implemented node types:

- `Box`, `Row`, `Column`, `Text`, `Image`
- `Stack`, `Grid`, `Spacer`, `Divider`, `Icon`
- `ProgressBar`, `Avatar`, `Badge`, `Chip`, `Button`, `Toggle`, `Accordion`, `Tabs`
- `Switch` (structural branch selector)

Supported card-level features:

- `$ref` state binding
- node-level `$if` conditional rendering
- structural `Switch` branch selection with static cases
- `for...in` loops
- `fragments` plus `$use` subtree reuse
- reusable `styles` plus `$style` references
- node-level `responsive.medium` overrides for container widths up to `768px`
- node-level `responsive.compact` overrides for container widths up to `480px`
- `hoverStyle`
- structured `transition`
- directional `borderRadius`
- `objectFit`, `objectPosition`, `aspectRatio`, `backdropBlur`, and structured `clipPath`
- `Button` / `Toggle` disabled state
- `Accordion` and `Tabs` local interactive state with hidden-content budgeting

For full details, see:

- [`safe-ugc-ui-card-spec.md`](./safe-ugc-ui-card-spec.md)
- [`safe-ugc-ui-card-spec-lite.md`](./safe-ugc-ui-card-spec-lite.md)
- [`safe-ugc-ui-card-spec.types.ts`](./safe-ugc-ui-card-spec.types.ts)

## Security Model

JSON Schema is structural only. Actual safety checks live in `@safe-ugc-ui/validator`.

Recommended host boundary:

- call `loadCardRaw()` for untrusted raw JSON at import/ingest time
- use `loadCard()` only when the host has already parsed the payload
- treat `validateRaw()` and `validate()` as lower-level diagnostics APIs
- treat low-level renderer internals such as `renderTree()` as advanced APIs that assume prior validation
- treat card-authored `state` and any host-provided runtime `state` overrides as untrusted inputs
- treat final `assets` map values as host-controlled inputs; card authors may reference `@assets/...`, but hosts decide the actual file/URL provenance and any origin restrictions
- let `UGCRenderer` revalidate the effective merged runtime state before rendering

The validation pipeline enforces:

- external URL blocking for user-controlled asset fields
- style objects as a closed DSL, so unknown style keys are rejected instead of ignored
- path traversal checks for `@assets/...`
- CSS function restrictions such as `url()`, `var()`, `calc()`, `expression()`
- layout isolation rules like forbidding `position: fixed` and `position: sticky`
- runtime-oriented limits for card size, node count, loop count, renderable text output, and effective style output using the merged state
- prototype-pollution protection in `$ref` paths

`UGCContainer` adds renderer-side isolation with `overflow: hidden`, `isolation: isolate`,
`contain: content`, and `position: relative`, and `containerStyle` cannot override those keys.

## Development

### Prerequisites

- Node.js `>= 20.19.0`
- pnpm `>= 9`

### Common commands

```bash
pnpm install
pnpm build
pnpm test
pnpm test:run
pnpm test:coverage
pnpm clean
pnpm --filter @safe-ugc-ui/schema build
pnpm --filter @safe-ugc-ui/demo dev
```

## Repository Layout

```text
packages/
  types/       Zod schemas, inferred TS types, constants
  schema/      JSON Schema generation and static schema artifact
  validator/   Validation pipeline and diagnostic result types
  react/       React renderer, components, asset/style/state helpers
  demo/        Vite playground
```

Tests live alongside source as `*.test.ts` or `*.test.tsx`.

## Maintainer Notes

- Update `README.md`, `AGENTS.md`, and `CLAUDE.md` together when package versions, public APIs,
  commands, or workflow expectations change.
- Releases are published by GitHub Actions via npm trusted publishing from `v*` tags after local `pnpm build` and `pnpm test:run` checks pass.
- The actual publish step runs inside `publish.yml` via `pnpm -r publish --access public --no-git-checks`, not as a normal local maintainer command.
- Treat `safe-ugc-ui-card-spec.md` as the source of truth for current card behavior.
- Treat `safe-ugc-ui-spec-v0.3.md` as design history, not the current implementation contract.

## License

[MIT](./LICENSE)
