# Repository Guidelines

This repository hosts Safe UGC UI, a pnpm workspace for describing, validating, and rendering
untrusted UI cards.

## Documentation Hygiene

- Keep `README.md`, `AGENTS.md`, and `CLAUDE.md` aligned when package versions, public APIs,
  commands, or workflow expectations change.
- `README.md` is user-facing. `AGENTS.md` and `CLAUDE.md` are tool-facing summaries.
- The current behavior spec is `safe-ugc-ui-card-spec.md`. `safe-ugc-ui-spec-v0.3.md` is design history.

## Project Structure & Module Organization

- `packages/types/src` — Zod schemas, inferred TS types, numeric/string constraints, and shared ref-path helpers.
- `packages/schema/src` — JSON Schema generation; build output lands at `packages/schema/dist/ugc-card.schema.json`.
- `packages/validator/src` — validation pipeline plus safe card load/import helpers for schema, nodes, values, styles, security, and limits.
- `packages/react/src` — `UGCRenderer`, `UGCContainer`, node renderer, asset/style/state helpers, and 18 React components.
- `packages/demo` — Vite playground that edits JSON and previews rendered cards.
- Build outputs land in `packages/*/dist`. Tests live next to source as `*.test.ts` or `*.test.tsx`.

## Project Status

- Phase 2 plus the `v1.0` interactive container milestone are implemented.
- Published packages are `@safe-ugc-ui/types`, `@safe-ugc-ui/schema`, `@safe-ugc-ui/validator`, `@safe-ugc-ui/react` at `2.2.0`.
- The `v1.1` safe visual/layout pack is implemented on `main`.
- The style system includes font family tokens, text shadow, repeating linear gradients, `aspectRatio`, `backdropBlur`, structured `clipPath`, and node-level `responsive.medium` / `responsive.compact` overrides.
- Nodes support `$if` conditional rendering, structural `Switch` branching, and `Button` / `Toggle` support `disabled`.
- Text authoring supports structured `$template`, `Text.spans`, and `Text.maxLines` / `truncate`.
- Cards support top-level `fragments` and `$use` references for non-recursive subtree reuse.
- `Accordion` and `Tabs` are implemented as renderer-owned interactive containers.
- `@safe-ugc-ui/demo` is private and remains at `0.1.0`.

## Build, Test, and Development Commands

- Tooling baseline for local development: Node.js `>= 20.19.0`, pnpm `>= 9`.
- `pnpm build` — build all workspace packages.
- `pnpm test` — run Vitest in workspace mode.
- `pnpm test:clean-checkout` — verify workspace tests plus demo typecheck and build from a clean workspace without prebuilt package `dist` outputs.
- `pnpm test:contracts` — run the targeted contract-regression gate for host-facing validator/renderer boundaries, including a clean-workspace canary.
- `pnpm test:contracts:packages` — run only the validator/react contract-regression suites without the workspace canary.
- `pnpm test:run` — non-watch test run.
- `pnpm test:coverage` — run the workspace test suite with coverage output.
- `pnpm release:pack-check` — verify that each publishable tarball contains the expected build outputs and exported entrypoints.
- `pnpm release:check` — run the shared pre-tag release baseline: format check, contract gate, clean-checkout gate, build, tarball/export verification, typecheck, audit, and coverage.
- `pnpm clean` — remove package `dist` directories.
- `pnpm format` — format the workspace with Prettier.
- `pnpm format:check` — check whether the workspace is Prettier-formatted.
- The main CI workflow and the tag-based publish workflow both use `pnpm release:check` as the shared release baseline.
- `pnpm --filter @safe-ugc-ui/schema build` — regenerate JSON Schema output.
- `pnpm --filter @safe-ugc-ui/demo dev` — run the demo app locally.
- `pnpm --filter @safe-ugc-ui/validator test` — run validator tests only.
- `pnpm --filter @safe-ugc-ui/react test` — run renderer tests only.

## Coding Style & Naming Conventions

- TypeScript ESM with `strict` enabled; use explicit `.js` extensions in local imports.
- Follow existing 2-space indentation and file formatting.
- Prettier is the workspace formatter; prefer `pnpm format` over manual whitespace-only edits.
- File names use kebab-case. React components use PascalCase.
- Constants use `SCREAMING_SNAKE_CASE`; functions and variables use camelCase.

## Testing Guidelines

- Framework: Vitest.
- React tests use Testing Library with JSDOM.
- Put tests next to the feature as `*.test.ts` or `*.test.tsx`.
- Prefer targeted package test runs while iterating, then run broader coverage when needed.

## Commit & Pull Request Guidelines

- Use Conventional Commits style such as `feat: ...`, `fix: ...`, `docs: ...`.
- PRs should include a concise summary, affected packages, and test results.
- Include a screenshot or GIF when demo behavior changes.
- Update specs when behavior changes, especially `safe-ugc-ui-card-spec.md`.

## npm Packages

- Published under the `@safe-ugc-ui` scope on npm.
- `workspace:*` dependencies are resolved to concrete versions during publish.
- The semver-supported public package surface is the package root exports plus `@safe-ugc-ui/schema/ugc-card.schema.json`.
- `@safe-ugc-ui/types/internal/*` remains exported for workspace coordination and advanced tooling, but it is not covered by semver stability promises; external consumers should avoid it or pin exact versions.
- Releases are published by GitHub Actions via npm trusted publishing from `v*` tags.
- Typical release flow: bump versions, run `pnpm release:check` from a clean checkout, commit and push the release commit, then push a matching `vX.Y.Z` tag.
- `pnpm release:pack-check` verifies tarball contents and exported entrypoints before npm publish.
- The `publish.yml` workflow performs the actual publish by running `pnpm -r publish --access public --no-git-checks` on GitHub-hosted runners; maintainers normally do not publish from local machines.

## Specs & Security Notes

- JSON Schema is structural only; security and limits live in the validator.
- Prefer `loadCardRaw()` for untrusted raw JSON ingress and `loadCard()` for already-parsed inputs.
- Asset references must go through `@assets/...` and are checked in both validator and renderer.
- Style objects are a closed DSL; unknown style keys are rejected instead of ignored.
- Final `assets` map values are host-controlled; origin policy and remote URL provenance are host responsibilities.
- Card-authored `state` and any host-provided runtime `state` overrides are treated as untrusted inputs for validation and limits.
- Low-level renderer exports such as `renderTree()` assume prior validation by the caller.
- `UGCRenderer` revalidates against the effective merged runtime state before rendering.
- Invalid `viewName` values are reported via `onError` as `RUNTIME_VIEW_NOT_FOUND` and render `null`.
- Missing `iconResolver` soft-skips `Icon` nodes and reports `RUNTIME_ICON_RESOLVER_MISSING`.
- Text and style limits apply to resolved render output, not just authored literals.
- `UGCContainer` enforces renderer-side layout isolation with `overflow: hidden`, `isolation: isolate`, `contain: content`, and `position: relative`, and those keys are not overridable via `containerStyle`.
