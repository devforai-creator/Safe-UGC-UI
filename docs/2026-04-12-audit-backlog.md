# 2026-04-12 Audit Backlog

This document is the current execution backlog derived from the 2026-04-12
production-readiness audit.

Use this file for current sequencing. Keep `docs/production-readiness-backlog.md`
as the historical audit ledger that tracks older items and prior closure state.

## Current Gate

- Audit score: `3.90 / 5.00`
- Audit grade: `A`
- Current ruling:
  - current production gate blockers are closed
  - remaining open work is strategic duplication reduction, not an immediate
    deployment blocker

## Priority Model

- `P0`
  - must land before calling the current production gate closed
- `P1`
  - next-iteration hardening; not optional, but can follow the `P0` work
- `P2`
  - strategic structural work; important for long-term cost control, not the
    immediate gate

## Summary

| ID      | Priority | Release Gate      | Theme                                                | Status |
| ------- | -------- | ----------------- | ---------------------------------------------------- | ------ |
| AAB-001 | P0       | Before production | Clean-checkout workspace verification loop           | Closed |
| AAB-002 | P0       | Before production | Structured diagnostics for host integration failures | Closed |
| AAB-003 | P1       | Next iteration    | Regression coverage for integration-failure paths    | Closed |
| AAB-004 | P2       | Strategic         | Shared style/responsive/limit semantics layer        | Open   |

## AAB-001 — Make The Workspace Verification Loop Reproducible From A Clean Checkout

- Priority: `P0`
- Release Gate: `Before production`
- Risk:
  - a clean checkout still depends on prebuilt package outputs for the full
    workspace test loop
  - CI currently masks part of the problem with step ordering instead of
    exercising the failing path directly
- Evidence:
  - `packages/types/package.json:12-22` exports only `dist` entry points
  - `packages/validator/package.json:12-22` exports only `dist` entry points
  - `packages/react/package.json:12-22` exports only `dist` entry points
  - `.github/workflows/ci.yml:26-36` runs `pnpm test:clean-checkout`, then
    `pnpm build`, and only later runs broader checks
  - audit reproduction showed `pnpm test:clean-checkout` succeeding but an
    immediate `pnpm test:run` failing because workspace packages resolved
    missing `dist` outputs
- Required change:
  - choose one local-development contract and make it true:
    - either workspace consumers resolve source files directly
    - or the build graph is explicit and the verification commands require it
  - make CI expose the real local verification path instead of relying on
    incidental build ordering
- Acceptance:
  - from a clean checkout, the intended local verification loop is documented
    and actually passes
  - CI contains at least one path that would fail if a package again depends on
    missing local `dist` outputs
  - docs no longer imply that a clean checkout supports a broader loop than it
    really does
- Closure:
  - local test resolution now targets workspace source entry points through
    shared Vitest aliases instead of requiring prebuilt package `dist` outputs
  - `pnpm test:clean-checkout` is now the explicit clean-workspace contract:
    `pnpm clean && pnpm test:run && pnpm --filter @safe-ugc-ui/demo typecheck && pnpm --filter @safe-ugc-ui/demo build`
  - verified on `2026-04-12` with:
    - `pnpm test:clean-checkout`
    - `pnpm build`
    - `pnpm -r exec tsc --noEmit`
    - `pnpm format:check`

## AAB-002 — Turn Silent Host Integration Failures Into Structured Diagnostics

- Priority: `P0`
- Release Gate: `Before production`
- Risk:
  - hosts can get an empty render with no actionable signal when they pass a bad
    `viewName` or omit `iconResolver`
  - this weakens the renderer contract exactly at the integration boundary where
    users need the clearest failures
- Evidence:
  - `packages/react/src/UGCRenderer.tsx:118-124` selects a named view and
    returns `{ valid: false, errors: [] }` when it cannot resolve one
  - `packages/react/src/UGCRenderer.tsx:178-200` only emits `onError` when the
    error list is non-empty
  - `packages/react/src/components/Icon.tsx:13-18` returns `null` when no
    `iconResolver` is provided
  - `packages/react/src/react.test.tsx:705-714` covers successful named-view
    rendering, but there is no dedicated invalid-`viewName` diagnostic test
  - `packages/react/src/react.test.tsx:1909-1926` currently codifies the silent
    `Icon` null-render behavior
- Required change:
  - define explicit runtime diagnostics for bad `viewName` and missing
    `iconResolver`
  - route those diagnostics through the same structured error path used for
    other runtime failures
  - document whether these are fatal render failures or degraded-but-reported
    failures
- Acceptance:
  - invalid `viewName` produces a structured error instead of an empty error list
  - missing `iconResolver` no longer fails silently
  - renderer docs describe the host-facing contract for those cases
- Closure:
  - invalid `viewName` now reports `RUNTIME_VIEW_NOT_FOUND` through the normal
    `onError` path and returns `null`
  - missing `iconResolver` now soft-skips the `Icon` node and reports
    `RUNTIME_ICON_RESOLVER_MISSING`
  - renderer docs now describe both host-facing behaviors

## AAB-003 — Add Regression Coverage For The Remaining Integration-Failure Paths

- Priority: `P1`
- Release Gate: `Next iteration`
- Risk:
  - the repository has strong test coverage overall, but the specific silent or
    environment-dependent failure paths found in the audit are not locked tightly
    enough yet
- Evidence:
  - `packages/react/src/contract-regressions.test.tsx:13-26` already protects
    missing runtime asset mapping
  - `packages/validator/src/contract-regressions.test.ts:23-104` already
    protects loop-local and fragment-expanded asset validation
  - the targeted contract gate did not yet lock invalid `viewName`, missing
    `iconResolver`, or a smaller clean-workspace reproducibility canary
- Required change:
  - promote host-integration failures into the targeted `test:contracts` gate
  - add one smaller reproducibility guard around the clean-checkout contract
  - keep those checks in the default CI path
- Acceptance:
  - host-integration failure coverage is intentionally placed and documented
  - the clean-checkout verification contract has a smaller clean-workspace canary
    in the default CI path
  - CI fails if any of those regress
- Closure:
  - `packages/react/src/contract-regressions.test.tsx` now locks
    `RUNTIME_VIEW_NOT_FOUND` and `RUNTIME_ICON_RESOLVER_MISSING` alongside the
    existing renderer contract cases
  - root `pnpm test:contracts` is now a clean-workspace contract gate:
    `pnpm clean && pnpm test:contracts:packages && pnpm --filter @safe-ugc-ui/demo typecheck`
  - CI runs that smaller contract canary before the broader
    `pnpm test:clean-checkout` loop

## AAB-004 — Extract Shared Style, Responsive, And Limit Semantics

- Priority: `P2`
- Release Gate: `Strategic`
- Execution plan:
  - `docs/aab-004-plan.md`
- Current progress:
  - `AAB-004a` is landed
  - `AAB-004b` is landed
  - `AAB-004c` initial capability-registry slice is landed
  - shared enum/value-domain lists are now wired through schema, validator, and
    renderer-internal helpers
  - broader `AAB-004c` registry work remains open
- Risk:
  - the same author-facing DSL semantics are still encoded in multiple high-risk
    files, so a future rule change will keep demanding parallel edits
  - this is the main long-term cost driver called out by the audit
- Evidence:
  - `packages/validator/src/responsive-utils.ts:11-110` and
    `packages/react/src/node-renderer.tsx:179-276` both implement style merge
    semantics
  - `packages/validator/src/style-validator.ts:1196-1273` and
    `packages/react/src/style-mapper.ts:47-75,926-1031` both encode overlapping
    style-property meaning
  - `packages/validator/src/limits.ts:41-245` and
    `packages/react/src/node-renderer.tsx:278-336` both maintain related UTF-8
    byte counting and resolved-style accounting logic
- Required change:
  - identify which semantics should live in one shared internal layer
  - reduce duplicated merge/count/shape logic without collapsing the public
    package boundaries
- Acceptance:
  - at least one of the duplicated semantics clusters moves behind a shared
    helper boundary
  - a representative rule change no longer requires editing the same concept in
    multiple high-risk files

## Suggested Order

1. Finish `AAB-001` first, because it blocks confidence in every other local and
   CI verification step.
2. Finish `AAB-002` next, because it closes the last clearly user-visible silent
   failure paths.
3. Land `AAB-003` immediately after the fixes so the new contract is locked in.
4. Treat `AAB-004` as the follow-up structural program once the current contract
   is stable.

## Deferred Tooling

- `Prettier` is already in place and enforced by CI.
- Full lint adoption is intentionally not part of this backlog.
  - The audit's highest-risk items are runtime contract clarity and workspace
    reproducibility, not style policing.
  - Revisit lint only after the `P0` items above are closed.
