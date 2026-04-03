# Safe UGC UI

Safe UGC UI is a pnpm workspace for describing, validating, and rendering untrusted UI cards.
It combines a JSON card format, Zod-based types, JSON Schema generation, a security-focused
validator, and a React renderer that keeps user-provided UI inside a constrained container.

## Status

- Phase 2 is implemented.
- Published packages are currently `0.3.1`: `@safe-ugc-ui/types`, `@safe-ugc-ui/schema`, `@safe-ugc-ui/validator`, `@safe-ugc-ui/react`.
- `packages/demo` is a private playground app used for local development.

## Packages

| Package | Purpose |
|---------|---------|
| `@safe-ugc-ui/types` | Zod schemas, inferred TypeScript types, constants, helpers |
| `@safe-ugc-ui/schema` | JSON Schema generation and the built `ugc-card.schema.json` artifact |
| `@safe-ugc-ui/validator` | Structural, style, security, and limit validation |
| `@safe-ugc-ui/react` | `UGCRenderer`, `UGCContainer`, renderer internals, asset/style helpers |
| `@safe-ugc-ui/demo` | Vite-based playground for editing card JSON and previewing output |

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

## Quick Start

### Validate a card

Use `validateRaw()` when the input is still a JSON string so the validator can reject oversized
payloads before parsing:

```ts
import { validateRaw } from '@safe-ugc-ui/validator';

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

const result = validateRaw(rawCard);

if (!result.valid) {
  console.error(result.errors);
}
```

If the card is already parsed, use `validate()` instead.

### Render a card in React

`UGCRenderer` accepts either a parsed card object or a raw JSON string. It validates before
rendering and returns `null` on failure.

```tsx
import { UGCRenderer } from '@safe-ugc-ui/react';

export function CardPreview({ card }: { card: string }) {
  return (
    <UGCRenderer
      card={card}
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
- `assets` to resolve `@assets/...` references to host-controlled URLs
- `state` to override or extend `card.state`
- `containerStyle` to style the outer isolation container
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

A card is a JSON object with four main areas:

- `meta`: card identity and version metadata
- `assets`: named asset references that must use `@assets/...`
- `state`: precomputed values referenced via `{ "$ref": "$path.to.value" }`
- `views`: one or more renderable trees

Phase 2 components:

- `Box`, `Row`, `Column`, `Text`, `Image`
- `Stack`, `Grid`, `Spacer`, `Divider`, `Icon`
- `ProgressBar`, `Avatar`, `Badge`, `Chip`, `Button`, `Toggle`

Supported card-level features:

- `$ref` state binding
- `for...in` loops
- reusable `styles` plus `$style` references
- `hoverStyle`
- structured `transition`
- directional `borderRadius`
- `objectFit` and `objectPosition`

For full details, see:

- [`safe-ugc-ui-card-spec.md`](./safe-ugc-ui-card-spec.md)
- [`safe-ugc-ui-card-spec-lite.md`](./safe-ugc-ui-card-spec-lite.md)
- [`safe-ugc-ui-card-spec.types.ts`](./safe-ugc-ui-card-spec.types.ts)

## Security Model

JSON Schema is structural only. Actual safety checks live in `@safe-ugc-ui/validator`.

The validation pipeline enforces:

- external URL blocking for user-controlled asset fields
- path traversal checks for `@assets/...`
- CSS function restrictions such as `url()`, `var()`, `calc()`, `expression()`
- layout isolation rules like forbidding `position: fixed` and `position: sticky`
- runtime-oriented limits for card size, node count, loop count, text size, and style size
- prototype-pollution protection in `$ref` paths

`UGCContainer` adds renderer-side isolation with `overflow: hidden`, `isolation: isolate`,
`contain: content`, and `position: relative`.

## Development

### Prerequisites

- Node.js `>= 20`
- pnpm `>= 9`

### Common commands

```bash
pnpm install
pnpm build
pnpm test
pnpm test:run
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
- Treat `safe-ugc-ui-card-spec.md` as the source of truth for current card behavior.
- Treat `safe-ugc-ui-spec-v0.3.md` as design history, not the current implementation contract.

## License

[MIT](./LICENSE)
