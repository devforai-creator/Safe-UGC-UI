# Safe UGC UI

Safely render untrusted user-generated UI cards in sandboxed environments.

Safe UGC UI provides a JSON-based card format, a validation pipeline, and a React renderer. Users (or LLMs) describe UI layouts as JSON; the framework validates the card against security rules and resource limits, then renders it without risk of XSS, data exfiltration, or UI hijacking.

## Status

**Phase 2 (current)** — 16 components, `$ref` state binding, `for...in` loops, `$style` reuse, Grid, directional borderRadius, full security validation, React renderer.

## Packages

```
packages/
  types/       Type definitions, Zod schemas, constants
  schema/      JSON Schema generation (zod-to-json-schema)
  validator/   Validation pipeline (schema, security, styles, limits, expressions)
  react/       React renderer (Phase 2 components + style mapper)
  demo/        Interactive playground (Vite + React)
```

| Package | Description |
|---------|-------------|
| `@safe-ugc-ui/types` | Zod schemas for card structure, node types, style fields, and value types |
| `@safe-ugc-ui/schema` | Generates JSON Schema from Zod definitions for editor integration |
| `@safe-ugc-ui/validator` | Multi-stage validation: schema, node structure, value types, styles, security, limits, expressions |
| `@safe-ugc-ui/react` | React components + state resolver + style mapper + asset resolver |
| `@safe-ugc-ui/demo` | Split-pane playground with JSON editor and live preview |

### Dependency graph

```
types ─────┬── schema
           ├── validator
           └── react ──── validator
                 │
demo ────┬── react
         └── validator
```

## Install

```bash
npm install @safe-ugc-ui/react
# or
pnpm add @safe-ugc-ui/react
```

This pulls in `@safe-ugc-ui/types` and `@safe-ugc-ui/validator` as dependencies.

## Quick start

```bash
# Prerequisites: Node >= 20, pnpm >= 9

pnpm install
pnpm build
pnpm test
```

### Run the demo

```bash
cd packages/demo
pnpm dev        # http://localhost:5173
```

### Use in your app

```tsx
import { validate } from '@safe-ugc-ui/validator';
import { UGCRenderer } from '@safe-ugc-ui/react';

const card = {
  meta: { name: 'hello', version: '1.0.0' },
  state: { greeting: 'Hello, World!' },
  views: {
    Main: {
      type: 'Box',
      style: { padding: 24, backgroundColor: '#1a1a2e', borderRadius: 12 },
      children: [
        {
          type: 'Text',
          content: { $ref: '$greeting' },
          style: { fontSize: 20, color: '#00f0ff' },
        },
      ],
    },
  },
};

const result = validate(card);
if (result.valid) {
  return <UGCRenderer card={card} />;
}
```

## Card format

A card is a JSON object:

```json
{
  "meta": { "name": "my-card", "version": "1.0.0" },
  "assets": { "avatar": "@assets/avatar.png" },
  "state": { "username": "Alice", "level": 42 },
  "views": {
    "Main": {
      "type": "Box",
      "style": { "padding": 16 },
      "children": [
        {
          "type": "Text",
          "content": { "$ref": "$username" }
        }
      ]
    }
  }
}
```

- **Layout nodes** (Box, Row, Column) have `children`
- **Content nodes** (Text, Image) use top-level fields (no `props` wrapper)
- **State binding** via `{ "$ref": "$variableName" }`
- **Images** must use `@assets/` paths (no external URLs)

For full details, see:
- [`safe-ugc-ui-card-spec.md`](./safe-ugc-ui-card-spec.md) — full spec
- [`safe-ugc-ui-card-spec-lite.md`](./safe-ugc-ui-card-spec-lite.md) — LLM-friendly summary
- [`safe-ugc-ui-card-spec.types.ts`](./safe-ugc-ui-card-spec.types.ts) — TypeScript type guide

## Security model

See `SECURITY.md` for reporting and scope details.

The validation pipeline enforces:

- **No untrusted external URLs** — images use `@assets/` paths resolved to host-controlled CDN URLs; user-specified external URLs are blocked
- **No script execution** — no event handlers, no `javascript:` URIs, no `$expr` evaluation (Phase 1)
- **Open decision** — `$expr` exists as a placeholder but is not evaluated; see `AGENTS.md` for the keep/remove decision
- **No CSS injection** — `url()`, `var()`, `calc()`, `expression()` functions are rejected
- **Layer isolation** — `position: fixed/sticky` forbidden, `z-index` capped at 0-100
- **Resource limits** — card size (1MB), node count (10K), text content (200KB), style size (100KB)
- **Prototype pollution prevention** — `__proto__`, `constructor`, `prototype` segments blocked in `$ref` paths

## Validation pipeline

```
Input → Size check → JSON parse → Schema (Zod) → Node structure
  → Value types → Styles → Security → Limits → Expressions → Result
```

Schema validation fails fast. All other checks run and accumulate errors.

## Project structure

```
/
├── packages/
│   ├── types/             Zod schemas + TypeScript types + constants
│   │   └── src/
│   │       ├── values.ts       Ref, Expr, Dynamic, Length, Color schemas
│   │       ├── styles.ts       StyleProps schema (40+ properties)
│   │       ├── props.ts        Component field schemas (legacy filename)
│   │       ├── primitives.ts   16 node type schemas (discriminated union)
│   │       ├── card.ts         Top-level card schema
│   │       └── constants.ts    All numeric limits + enums
│   │
│   ├── schema/            JSON Schema generation
│   │
│   ├── validator/         Validation pipeline
│   │   └── src/
│   │       ├── schema.ts          Zod parse + structural checks
│   │       ├── node-validator.ts  Node structure + hierarchy rules
│   │       ├── value-types.ts     Ref/Expr/Static type restrictions
│   │       ├── style-validator.ts Color/Length format + range checks
│   │       ├── security.ts        URL blocking, path traversal, $ref resolve
│   │       ├── limits.ts          Resource limit enforcement
│   │       └── expr-constraints.ts Expression tokenizer + constraints
│   │
│   ├── react/             React renderer
│   │   └── src/
│   │       ├── UGCRenderer.tsx    Public component
│   │       ├── node-renderer.tsx  Recursive renderer (Phase 2 types)
│   │       ├── state-resolver.ts  $ref resolution with bracket notation
│   │       ├── style-mapper.ts    StyleProps → CSSProperties
│   │       ├── asset-resolver.ts  @assets/ → CDN URL mapping
│   │       └── components/        16 React components (Box…Toggle)
│   │
│   └── demo/              Vite playground
│
├── safe-ugc-ui-spec-v0.3.md          Internal design spec
├── safe-ugc-ui-card-spec.md          Full card spec (Phase 2)
├── safe-ugc-ui-card-spec-lite.md     LLM-friendly summary
├── safe-ugc-ui-card-spec.types.ts    TypeScript type guide
└── vitest.workspace.ts
```

## Roadmap

| Phase | Scope |
|-------|-------|
| **Phase 1 (done)** | Box, Row, Column, Text, Image, `$ref`, validation, React renderer |
| **Phase 2 (done)** | 11 components, `for...in` loops, style reuse (`$style`), Grid, directional borderRadius, npm publish |
| Phase 3 | icon set bundling, editor tooling, themes |
| Future | `$expr` expression engine, interaction events (Button action, Toggle), CharLang text syntax |

## License

[MIT](./LICENSE)
