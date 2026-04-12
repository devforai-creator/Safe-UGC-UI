# Production Readiness Backlog

This document turns the 2026-04-12 production-readiness audit into an execution backlog.
It is not a feature roadmap. It tracks the hardening work required to close the current
production gate with explicit evidence, scope, and acceptance criteria.

## Current Gate

- Current gate status: blocked
- Production rollout status: do not approve until all open `P0` items are closed
- Review source: 2026-04-12 production-readiness audit

## How To Use This Backlog

For each item:

- `Priority`
  - `P0` — release blocker; must be fixed before approving production use
  - `P1` — important hardening; should land in the next iteration
  - `P2` — strategic improvement; not required to close the immediate gate
- `Release Gate`
  - `Before production`
  - `Next iteration`
  - `Strategic`
- `Evidence` cites the current file-level basis for the item
- `Acceptance` is the definition of done

## Backlog Summary

| ID | Priority | Release Gate | Theme | Status |
| --- | --- | --- | --- | --- |
| PRB-001 | P0 | Before production | Validator/renderer asset contract alignment | Open |
| PRB-002 | P0 | Before production | Runtime error signaling and no silent render drops | Open |
| PRB-003 | P0 | Before production | `Accordion` prop/state reconciliation | Open |
| PRB-004 | P1 | Next iteration | Closed DSL enforcement for style keys | Open |
| PRB-005 | P1 | Next iteration | Regression tests and CI gate for contract boundaries | Open |
| PRB-006 | P1 | Next iteration | Clean-checkout workspace reproducibility | Open |
| PRB-007 | P2 | Strategic | Shared style/responsive semantics layer | Open |

## PRB-001 — Align Asset Validation Semantics Across Validator And Renderer

- Priority: `P0`
- Release Gate: `Before production`
- Risk:
  - The validator can approve cards that the renderer later drops because the two layers do not
    resolve asset-bearing references the same way.
  - This breaks the core library contract that a successfully validated card is safe and usable to render.
- Evidence:
  - `packages/validator/src/security.ts:403-420` only resolves `Image` / `Avatar` `$ref` values from top-level `state` and explicitly skips unresolved refs as possible loop-local variables.
  - `packages/react/src/state-resolver.ts:24-38` resolves refs against `locals` first, then `state`.
  - `packages/react/src/node-renderer.tsx:626-646` silently returns `null` when an asset path is invalid, missing, or resolves to an unsafe final URL.
- Required change:
  - Unify the asset validation contract so every `Image.src` / `Avatar.src` path that can be resolved by the renderer is also validated by import-time validation.
  - Cover literal strings, state refs, loop-local refs, and fragment-expanded trees with the same rule set.
- Acceptance:
  - `validate()` rejects loop-local external URLs and invalid asset paths that the renderer could otherwise resolve.
  - Fragment and `for...in` cases are covered by tests.
  - A single documented rule explains what counts as a valid author-controlled asset reference.

## PRB-002 — Eliminate Silent Runtime Failures For Asset And Render Errors

- Priority: `P0`
- Release Gate: `Before production`
- Risk:
  - Hosts can receive a partially blank UI with no signal that rendering failed.
  - `onError` semantics are inconsistent across invalid-card, runtime-limit, fragment, and asset failure paths.
- Evidence:
  - `packages/react/src/node-renderer.tsx:565-579` reports runtime limit errors via `onError`.
  - `packages/react/src/node-renderer.tsx:626-646` drops invalid or missing assets by returning `null` with no callback.
  - `packages/react/src/UGCRenderer.tsx:185-190` calls `onError` during render when validation fails.
- Required change:
  - Define a consistent runtime error strategy for render failures.
  - Stop silently dropping asset failures.
  - Move invalid-card error emission out of render-phase execution if needed so callback behavior is predictable under React re-renders and Strict Mode.
- Acceptance:
  - Asset resolution failures trigger structured diagnostics instead of silent `null` returns.
  - Invalid-card callbacks are emitted through a documented, stable path.
  - Renderer tests cover missing assets, unsafe resolved URLs, invalid fragments, and runtime limits.

## PRB-003 — Reconcile `Accordion` Local State With Prop Changes

- Priority: `P0`
- Release Gate: `Before production`
- Risk:
  - The interactive UI can drift away from the validated current card state when `items`,
    `defaultExpanded`, or `disabled` status changes after initial render.
- Evidence:
  - `packages/react/src/components/Accordion.tsx:39-64` initializes `expandedIds` once and never reconciles it with new props.
  - `packages/react/src/components/Tabs.tsx:83-100` already contains the missing reconciliation pattern for tabs.
  - `packages/react/src/react.test.tsx:1472-1543` tests initial accordion behavior but not rerender synchronization.
- Required change:
  - Add prop/state reconciliation logic for `Accordion` that mirrors the intended behavior for current enabled items and default expansion.
- Acceptance:
  - Rerendering with a newly disabled open item closes or reselects state consistently.
  - Rerendering with new `items` or `defaultExpanded` values produces deterministic UI state.
  - New tests cover rerender behavior, not just initial clicks.

## PRB-004 — Enforce The Closed Style DSL And Reject Unknown Style Keys

- Priority: `P1`
- Release Gate: `Next iteration`
- Risk:
  - Typos in author-facing style keys are silently accepted and ignored, which weakens the validator’s value as a correctness gate.
  - A closed DSL that behaves like an open object is hard to reason about for integrators.
- Evidence:
  - `packages/types/src/styles.ts:548-584` defines `hoverStylePropsSchema`, `responsiveStylePropsSchema`, and `stylePropsSchema` as non-`strict()` `z.object(...)` schemas.
  - `packages/validator/src/style-validator.ts:1154-1283` validates known rules and forbidden keys but does not reject unknown safe-looking properties.
  - Audit reproduction showed `style: { fontSzie: 12 }` passing both `validateSchema()` and `validate()`.
- Required change:
  - Decide whether style objects are a closed DSL.
  - If yes, reject unknown keys consistently at schema and validator boundaries.
  - If no, document the open-world behavior explicitly and explain how hosts should interpret ignored fields.
- Acceptance:
  - The chosen contract is explicit in docs and tests.
  - Unknown style keys are either rejected or intentionally documented and covered by tests.

## PRB-005 — Add Regression Coverage For Contract-Boundary Failures

- Priority: `P1`
- Release Gate: `Next iteration`
- Risk:
  - The repository has broad test coverage but is still missing regression tests for the exact paths where validator and renderer can drift apart.
- Evidence:
  - `packages/validator/src/validator.test.ts:2557-2658` covers merged `$style` security and limits well.
  - `packages/react/src/react.test.tsx:1845-1903,1906-1958` covers responsive rendering and runtime limits.
  - The audit defects around loop-local asset refs, unknown style keys, silent asset failures, and accordion rerender behavior are not fixed by existing tests.
- Required change:
  - Add explicit regression tests for every defect found in the audit.
  - Promote these tests into the default CI path so the contract is guarded continuously.
- Acceptance:
  - Tests exist for:
    - loop-local invalid asset refs
    - fragment-expanded invalid asset refs
    - missing asset callbacks
    - unknown style key behavior
    - accordion rerender synchronization
  - CI fails if any of those contract boundaries regress.

## PRB-006 — Make Workspace Consumers Work From A Clean Checkout

- Priority: `P1`
- Release Gate: `Next iteration`
- Risk:
  - New contributors and CI variants can hit false failures because workspace consumers depend on prebuilt `dist` artifacts.
- Evidence:
  - `packages/react/package.json:12-18` and `packages/validator/package.json:12-18` export only `dist` entry points and declarations.
  - `packages/demo/src/App.tsx:1-4` imports workspace packages directly.
  - Audit reproduction after `pnpm clean` showed `pnpm --filter @safe-ugc-ui/demo exec tsc --noEmit` failing until workspace packages were rebuilt.
  - `.github/workflows/ci.yml:29-33` hides this by always building before type checking.
- Required change:
  - Make local workspace consumers resolve source or project-reference outputs in a clean checkout, or add an explicit guardrail that verifies and documents the required build graph.
- Acceptance:
  - A clean checkout can run the intended local development loop without hidden module-resolution failures.
  - CI includes at least one clean-worktree validation that exposes this class of issue.
  - Documentation reflects the real setup path.

## PRB-007 — Extract Shared Style And Responsive Semantics

- Priority: `P2`
- Release Gate: `Strategic`
- Risk:
  - The same DSL semantics are implemented in multiple layers, increasing change cost and drift risk.
- Evidence:
  - `packages/validator/src/responsive-utils.ts:11-122` and `packages/react/src/node-renderer.tsx:173-275` both implement style merging behavior.
  - `packages/validator/src/style-validator.ts:1138-1283` and `packages/react/src/style-mapper.ts:47-259` both encode overlapping style-property semantics.
  - `packages/validator/src/limits.ts:41-245` and `packages/react/src/node-renderer.tsx:149-329` both maintain related UTF-8 counting and resolved-style accounting logic.
- Required change:
  - Identify the shared semantics that should live in one reusable layer and reduce duplicate implementations.
  - Keep package boundaries clear, but stop encoding the same rules independently where drift has already proven costly.
- Acceptance:
  - Shared semantics move behind reusable helpers or a dedicated internal package/module boundary.
  - A style or responsive rule change no longer requires parallel logic edits in multiple high-risk files unless strictly necessary.

## Suggested Execution Order

1. Close `PRB-001`, `PRB-002`, and `PRB-003` first. These are the current release blockers.
2. Land `PRB-005` alongside those fixes so the same defects cannot reopen.
3. Fix `PRB-006` next to improve contributor and CI reliability.
4. Tackle `PRB-004` and `PRB-007` once the immediate contract gaps are closed.

## Exit Criteria For Re-Review

Request a fresh production-readiness review only after:

- all `P0` items are closed
- new regression tests are merged and green in CI
- the docs reflect the actual runtime/validation contract
- the clean-checkout developer path is reproducible
