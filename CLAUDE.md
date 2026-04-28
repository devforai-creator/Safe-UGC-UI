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
- Published packages are `@safe-ugc-ui/types`, `@safe-ugc-ui/schema`, `@safe-ugc-ui/validator`, and `@safe-ugc-ui/react` at `2.3.0`.
- The `v1.1` safe visual/layout pack is implemented on `main`.
- The style system includes font family tokens, text shadow, repeating linear gradients, `aspectRatio`, `backdropBlur`, structured `clipPath`, and node-level `responsive.medium` / `responsive.compact` overrides.
- Nodes support `$if` conditional rendering, structural `Switch` branching, and `Button` / `Toggle` support `disabled`.
- Text authoring supports structured `$template`, `Text.spans`, and `Text.maxLines` / `truncate`.
- Cards support top-level `fragments` and `$use` references for non-recursive subtree reuse.
- `Accordion` and `Tabs` are implemented as renderer-owned interactive containers.
- `packages/demo` is a private Vite playground.

## Project Structure

- `packages/types/src` — Zod schemas, inferred TS types, constraints, and shared ref-path helpers.
- `packages/schema/src` — JSON Schema generation and the static schema artifact.
- `packages/validator/src` — schema, node, value, style, security, limit validation, and safe card load/import helpers.
- `packages/react/src` — `UGCRenderer`, `UGCContainer`, node renderer, components, asset/style/state helpers.
- `packages/demo` — JSON editor plus live preview app.

## Commands

- Tooling baseline for local development: Node.js `>= 20.19.0`, pnpm `>= 9`.
- `pnpm build` — build all packages.
- `pnpm test` — run workspace Vitest.
- `pnpm test:clean-checkout` — verify workspace tests plus demo typecheck and build from a clean workspace without prebuilt package `dist` outputs.
- `pnpm test:contracts` — run the targeted contract-regression gate for host-facing validator/renderer boundaries, including a clean-workspace canary.
- `pnpm test:contracts:packages` — run only the validator/react contract-regression suites without the workspace canary.
- `pnpm test:run` — non-watch test run.
- `pnpm test:coverage` — run the workspace test suite with coverage output.
- `pnpm release:pack-check` — verify that each publishable tarball contains the expected build outputs and exported entrypoints.
- `pnpm release:check` — run the shared pre-tag release baseline: format check, contract gate, clean-checkout gate, build, tarball/export verification, typecheck, audit, and coverage.
- `pnpm clean` — remove `dist` folders.
- `pnpm format` — format the workspace with Prettier.
- `pnpm format:check` — check whether the workspace is Prettier-formatted.
- The main CI workflow and the tag-based publish workflow both use `pnpm release:check` as the shared release baseline.
- CI runs that baseline on Node `20.19.0`; `publish.yml` intentionally runs it on Node `24` because npm trusted publishing requires a newer runner runtime.
- `pnpm --filter @safe-ugc-ui/schema build` — regenerate JSON Schema output.
- `pnpm --filter @safe-ugc-ui/demo dev` — run the demo app.
- `pnpm --filter @safe-ugc-ui/validator test` — validator-only tests.
- `pnpm --filter @safe-ugc-ui/react test` — renderer-only tests.

## Coding Expectations

- TypeScript ESM with `strict` enabled.
- Use explicit `.js` extensions in local imports.
- Match existing 2-space indentation and formatting.
- Prettier is the workspace formatter; use `pnpm format` for formatting changes.
- Use kebab-case for files and PascalCase for React component names.
- Use `SCREAMING_SNAKE_CASE` for constants and camelCase for functions/variables.

## Testing Expectations

- Use Vitest.
- Keep tests next to source as `*.test.ts` or `*.test.tsx`.
- React tests use Testing Library and JSDOM.

## Publishing

- 유지보수자는 보통 로컬에서 직접 publish하지 않는다.
- semver로 지원하는 공개 패키지 경계는 각 패키지의 루트 export와 `@safe-ugc-ui/schema/ugc-card.schema.json`이다.
- `@safe-ugc-ui/types/internal/*`는 workspace 조정과 고급 도구 사용을 위해 export를 유지하지만, semver 안정성 보장은 하지 않는다. 외부 소비자는 가능하면 피하거나 exact version을 고정한다.
- 릴리스는 GitHub Actions의 `publish.yml`이 npm trusted publishing으로 처리한다.
- 실제 publish 명령은 워크플로 안에서 `pnpm -r publish --access public --no-git-checks`로 실행한다. `npm publish`를 쓰면 `workspace:*` 의존성이 실제 버전으로 치환되지 않는다.
- `publish.yml`은 npm trusted publishing 요구사항 때문에 Node `24`를 사용하고, 로컬 개발과 CI는 문서화된 Node `20.19.0` baseline을 유지한다.
- 절차: 버전 bump → 깨끗한 checkout에서 `pnpm release:check` 실행 → 릴리스 커밋 push → `vX.Y.Z` 태그 push.
- `pnpm release:pack-check`는 publish 전에 tarball 내용과 export 경계를 검증한다.
- 로컬 `.npmrc`에 npm write 토큰을 지속적으로 저장하지 않는다.
- 1.2.0은 `npm publish`로 잘못 나갔으므로 사용하지 않는다. 이후 릴리스에서도 최신 버전 표기와 package.json 버전을 함께 갱신한다.

## Security Notes

- JSON Schema is structural only; enforcement lives in the validator.
- Prefer `loadCardRaw()` for untrusted raw JSON ingress and `loadCard()` for already-parsed inputs.
- Asset references must use `@assets/...`.
- Style objects are a closed DSL; unknown style keys are rejected instead of ignored.
- Final `assets` map values are host-controlled; origin policy and remote URL provenance are host responsibilities.
- Card-authored `state` and any host-provided runtime `state` overrides are treated as untrusted inputs for validation and limits.
- Low-level renderer exports such as `renderTree()` assume prior validation by the caller.
- `UGCRenderer` revalidates the effective merged runtime state before rendering.
- Invalid `viewName` values are reported via `onError` as `RUNTIME_VIEW_NOT_FOUND` and render `null`.
- Missing `iconResolver` soft-skips `Icon` nodes and reports `RUNTIME_ICON_RESOLVER_MISSING`.
- Text and style limits apply to resolved render output, not just authored literals.
- `UGCContainer` supplies renderer-side layout isolation, and `containerStyle` cannot override the protected isolation keys. Hosts can override only the overflow key, and only via the hostOverflow prop.
