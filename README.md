# Safe UGC UI

Safely render untrusted user-generated UI cards in sandboxed environments.

Safe UGC UI provides a JSON-based card format, a validation pipeline, and a React renderer. Users (or LLMs) describe UI layouts as JSON; the framework validates the card against security rules and resource limits, then renders it without risk of XSS, data exfiltration, or UI hijacking.

## Status

**Phase 1 (MVP)** — 5 components (Box, Row, Column, Text, Image), `$ref` state binding, full security validation, React renderer.

## Packages

```
packages/
  types/       Type definitions, Zod schemas, constants
  schema/      JSON Schema generation (zod-to-json-schema)
  validator/   Validation pipeline (schema, security, styles, limits, expressions)
  react/       React renderer (Phase 1 components + style mapper)
  demo/        Interactive playground (Vite + React)
```

| Package | Description |
|---------|-------------|
| `@safe-ugc-ui/types` | Zod schemas for card structure, node types, style props, and value types |
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
          props: { content: { $ref: '$greeting' } },
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
          "props": { "content": { "$ref": "$username" } }
        }
      ]
    }
  }
}
```

- **Layout nodes** (Box, Row, Column) have `children`
- **Content nodes** (Text, Image) have `props`
- **State binding** via `{ "$ref": "$variableName" }`
- **Images** must use `@assets/` paths (no external URLs)

For full details, see [`safe-ugc-ui-card-spec.md`](./safe-ugc-ui-card-spec.md).

## Security model

The validation pipeline enforces:

- **No untrusted external URLs** — images use `@assets/` paths resolved to host-controlled CDN URLs; user-specified external URLs are blocked
- **No script execution** — no event handlers, no `javascript:` URIs, no `$expr` evaluation (Phase 1)
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
│   │       ├── props.ts        Component props schemas
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
│   │       ├── node-renderer.tsx  Recursive renderer (Phase 1 types)
│   │       ├── state-resolver.ts  $ref resolution with bracket notation
│   │       ├── style-mapper.ts    StyleProps → CSSProperties
│   │       ├── asset-resolver.ts  @assets/ → CDN URL mapping
│   │       └── components/        Box, Row, Column, Text, Image
│   │
│   └── demo/              Vite playground
│
├── safe-ugc-ui-spec-v0.3.md      Internal design spec
├── safe-ugc-ui-card-spec.md       LLM-facing card spec (Phase 1)
└── vitest.workspace.ts
```

## Roadmap

| Phase | Scope |
|-------|-------|
| **Phase 1 (done)** | Box, Row, Column, Text, Image, `$ref`, validation, React renderer |
| Phase 2 | Remaining 11 components, `for...in` loops, style reuse (`$style`), directional borderRadius |
| Phase 3 | npm publish, icon set bundling, editor tooling, themes |
| Future | `$expr` expression engine, interaction events (Button action, Toggle), CharLang text syntax |

## License

[MIT](./LICENSE)
