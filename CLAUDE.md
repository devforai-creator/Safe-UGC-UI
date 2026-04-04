# Claude Guidance

This file mirrors the repository-level operating guidance in `AGENTS.md` so Claude-style tools can
pick up the same project context.

## Keep These Files In Sync

- Update `README.md`, `AGENTS.md`, and `CLAUDE.md` together when package versions, public APIs,
  commands, or workflow expectations change.
- `README.md` is user-facing. `AGENTS.md` and `CLAUDE.md` are tool-facing summaries.
- Use `safe-ugc-ui-card-spec.md` as the current behavior spec. `safe-ugc-ui-spec-v0.3.md` is historical design context.

## Repository Overview

- Safe UGC UI is a pnpm workspace for schema, validation, and React rendering of untrusted UI cards.
- Phase 2 plus the `v1.0` interactive container milestone are implemented.
- Published packages are `@safe-ugc-ui/types`, `@safe-ugc-ui/schema`, `@safe-ugc-ui/validator`, and `@safe-ugc-ui/react` at `1.0.0`.
- The `v1.1` safe visual/layout pack is implemented on `main`.
- The style system includes font family tokens, text shadow, repeating linear gradients, `aspectRatio`, `backdropBlur`, structured `clipPath`, and node-level `responsive.medium` / `responsive.compact` overrides.
- Nodes support `$if` conditional rendering, and `Button` / `Toggle` support `disabled`.
- Text authoring supports structured `$template`, `Text.spans`, and `Text.maxLines` / `truncate`.
- Cards support top-level `fragments` and `$use` references for non-recursive subtree reuse.
- `Accordion` and `Tabs` are implemented as renderer-owned interactive containers.
- `packages/demo` is a private Vite playground.

## Project Structure

- `packages/types/src` — Zod schemas, inferred TS types, and constraints.
- `packages/schema/src` — JSON Schema generation and the static schema artifact.
- `packages/validator/src` — schema, node, value, style, security, and limit validation.
- `packages/react/src` — `UGCRenderer`, `UGCContainer`, node renderer, components, asset/style/state helpers.
- `packages/demo` — JSON editor plus live preview app.

## Commands

- `pnpm build` — build all packages.
- `pnpm test` — run workspace Vitest.
- `pnpm test:run` — non-watch test run.
- `pnpm clean` — remove `dist` folders.
- `pnpm --filter @safe-ugc-ui/schema build` — regenerate JSON Schema output.
- `pnpm --filter @safe-ugc-ui/demo dev` — run the demo app.
- `pnpm --filter @safe-ugc-ui/validator test` — validator-only tests.
- `pnpm --filter @safe-ugc-ui/react test` — renderer-only tests.

## Coding Expectations

- TypeScript ESM with `strict` enabled.
- Use explicit `.js` extensions in local imports.
- Match existing 2-space indentation and formatting.
- Use kebab-case for files and PascalCase for React component names.
- Use `SCREAMING_SNAKE_CASE` for constants and camelCase for functions/variables.

## Testing Expectations

- Use Vitest.
- Keep tests next to source as `*.test.ts` or `*.test.tsx`.
- React tests use Testing Library and JSDOM.

## Security Notes

- JSON Schema is structural only; enforcement lives in the validator.
- Asset references must use `@assets/...`.
- `UGCContainer` supplies renderer-side layout isolation.
