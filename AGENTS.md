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

## Specs & Security Notes
- Follow the card spec in `safe-ugc-ui-card-spec.md` for Phase 1 behavior.
- Treat JSON Schema as structural validation only; security/limits live in the validator.
- Asset references must go through `@assets/` and are validated in both validator and renderer.
