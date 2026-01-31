# Repository Guidelines

This repository hosts Safe UGC UI, a pnpm workspace with TypeScript packages for schema, validation, and rendering of untrusted UI cards.

## Project Structure & Module Organization
- `packages/types/src` — Zod schemas (source of truth), inferred TS types, and constraint constants.
- `packages/schema/src` — JSON Schema generator; build output at `packages/schema/dist/ugc-card.schema.json`.
- `packages/validator/src` — validation pipeline (schema, security, limits, styles, expressions).
- `packages/react/src` — React renderer (`UGCRenderer`, `UGCContainer`) and style mapping.
- `packages/demo` — Vite demo app.
- Build outputs land in `packages/*/dist`. Tests live alongside code as `*.test.ts`/`*.test.tsx`.

## Build, Test, and Development Commands
- `pnpm build` — builds all packages (runs `pnpm -r build`).
- `pnpm test` — runs Vitest in workspace mode.
- `pnpm test:run` — non-watch test run.
- `pnpm --filter @safe-ugc-ui/schema build` — regenerate JSON Schema output.
- `pnpm --filter @safe-ugc-ui/demo dev` — run the demo app locally.

## Coding Style & Naming Conventions
- TypeScript ESM with `strict` enabled; use explicit `.js` extensions in local imports.
- Indentation follows existing code (2 spaces); keep formatting consistent with current files.
- File names use kebab-case (e.g., `style-mapper.ts`); React components use PascalCase.
- Constants use `SCREAMING_SNAKE_CASE`; functions/variables use camelCase.

## Testing Guidelines
- Framework: Vitest; React tests use Testing Library + JSDOM.
- Name tests `*.test.ts` or `*.test.tsx` next to the feature they cover.
- Run targeted tests via `pnpm --filter @safe-ugc-ui/validator test` or workspace-wide via `pnpm test`.

## Commit & Pull Request Guidelines
- Git history shows Conventional Commits style (e.g., `feat: ...`); follow that format.
- PRs should include a concise summary, affected packages, and test results.
- If demo behavior changes, include a screenshot or GIF.
- Update specs when behavior changes (`safe-ugc-ui-card-spec.md`, `safe-ugc-ui-spec-v0.3.md`).

## npm Packages
- Published under `@safe-ugc-ui` scope on npmjs.com.
- Packages: `@safe-ugc-ui/types`, `@safe-ugc-ui/validator`, `@safe-ugc-ui/react` (all v0.1.0).
- `workspace:*` dependencies are resolved to real versions by pnpm at publish time.
- To publish a new version: bump versions, `pnpm build`, `pnpm -r publish --access public --no-git-checks`.

## Specs & Security Notes
- Follow the card spec in `safe-ugc-ui-card-spec.md` for current behavior (Phase 2).
- Treat JSON Schema as structural validation only; security/limits live in the validator.
- Asset references must go through `@assets/` and are validated in both validator and renderer.

## Open Decisions

### $expr: keep or remove? (pending)
`$expr` (expression objects like `{ "$expr": "$hp + 10" }`) exists in the schema and validator
since Phase 1 but is **not evaluated at runtime** — the renderer returns `undefined` for any
`$expr` value. The card spec tells LLMs not to use it ("reserved for future use").

Current state:
- `packages/types/src/values.ts`: `exprSchema`, `isExpr`, `dynamicSchema()` includes $expr union
- `packages/validator/src/expr-constraints.ts`: tokenizer validates $expr syntax safety
- `packages/validator/src/value-types.ts`: per-property $expr permission (e.g. forbidden on Image.src, Icon.name)
- `packages/react/src/state-resolver.ts`: `resolveValue()` returns `undefined` for $expr

Options:
1. **Keep as placeholder** — forward-compatible; if we add an expression engine later, schema/validator are ready.
2. **Remove from code** — strip `exprSchema` from `dynamicSchema()`, remove expr-constraints validation, align code with "must not be used" policy in the spec.

Decision deferred. When revisiting, update `safe-ugc-ui-card-spec.md` and `AGENTS.md` accordingly.
