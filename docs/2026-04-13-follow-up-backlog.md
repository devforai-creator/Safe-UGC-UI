# 2026-04-13 Follow-Up Backlog

This document tracks the next backlog after the 2026-04-12 production-readiness
audit backlog was fully closed on 2026-04-13.

Use this file for post-audit follow-up work. Keep
`docs/2026-04-12-audit-backlog.md` and `docs/production-readiness-backlog.md`
as the closed audit record.

## Current Position

- Audit carryover: closed
- Production gate status: ready for a targeted re-review
- This backlog is for release-hygiene and maintainability work beyond the
  closed audit gate

## Priority Model

- `P1`
  - next-release hardening; worth doing before the next publish or external
    rollout step
- `P2`
  - quality and maintainability work; important, but not a reopen of the
    closed audit gate

## Summary

| ID      | Priority | Theme                                          | Status |
| ------- | -------- | ---------------------------------------------- | ------ |
| FUB-001 | P1       | Align publish workflow with the tested CI gate | Open   |
| FUB-002 | P1       | Define and document internal subpath policy    | Open   |
| FUB-003 | P2       | Add a narrow correctness lint gate             | Open   |

## FUB-001 — Align Publish Workflow With The Tested CI Gate

- Priority: `P1`
- Why this exists:
  - the tag-based publish path does not currently exercise the same gate that
    the main CI path uses, so release confidence still depends on process
    discipline outside the workflow itself
- Evidence:
  - `.github/workflows/ci.yml:16-63` runs `pnpm format:check`,
    `pnpm test:contracts`, `pnpm test:clean-checkout`, `pnpm build`,
    `pnpm -r exec tsc --noEmit`, `pnpm audit`, and `pnpm test:coverage` on
    Node `20.19.0`
  - `.github/workflows/publish.yml:18-37` runs only `pnpm build` and
    `pnpm test:run` on Node `24`
  - `package.json:4-16` defines the contract gates that the main CI path uses
- Required change:
  - choose one release contract and make the publish path match it
  - either run the contract gates directly in `publish.yml` or gate tag publish
    behind an already-green CI path with the same Node baseline
  - document any deliberate differences instead of leaving them implicit
- Acceptance:
  - the publish path uses the same Node baseline as the tested CI path, or the
    difference is explicitly documented with a reason
  - the publish path either runs or clearly depends on the same contract gates
    that protect normal CI
  - release docs describe the real pre-tag checklist

## FUB-002 — Define And Document Internal Subpath Policy

- Priority: `P1`
- Why this exists:
  - the workspace now has useful shared internal helpers, but the package
    boundary story is still implicit
  - external consumers could import internal subpaths and assume semver
    stability where none has been promised
- Evidence:
  - `packages/types/package.json:19-30` exports
    `./internal/style-semantics`, `./internal/style-output`, and
    `./internal/style-key-sets`
  - `README.md:24-27,214-218` describes package purpose and low-level renderer
    internals, but does not define a stability policy for
    `@safe-ugc-ui/types/internal/*`
  - `AGENTS.md:8-9` and `CLAUDE.md:8-9` distinguish public API changes from
    internal guidance, but do not spell out how these exported internal
    subpaths should be treated
- Required change:
  - define whether `@safe-ugc-ui/types/internal/*` is workspace-only,
    advanced-but-unstable, or intentionally supported
  - document the stability expectation in user-facing and tool-facing docs
  - keep the current internal reuse path available for workspace consumers
- Acceptance:
  - docs explicitly state the stability policy for exported internal subpaths
  - maintainers have one clear rule for whether internal helper changes require
    public API treatment
  - external consumers are not left to infer the contract from package exports
    alone

## FUB-003 — Add A Narrow Correctness Lint Gate

- Priority: `P2`
- Why this exists:
  - formatting is now enforced, but there is still no low-noise static
    correctness gate between typechecking and tests
  - the next useful tooling step should catch likely bugs without reopening the
    style-tooling churn that was intentionally avoided
- Evidence:
  - `package.json:4-16` has `format` and `format:check`, but no `lint` script
  - repository search shows no current ESLint or Biome configuration
  - `README.md:54-63`, `AGENTS.md:42-51`, and `CLAUDE.md:35-44` now describe
    format commands, but not any lint workflow
- Required change:
  - adopt one correctness-focused lint tool with minimal overlap with Prettier
  - start with narrow rules that are likely to catch real defects, such as
    unused values, React hooks misuse, and TS import hygiene
  - avoid parallel style tooling or wide rule sets that would turn into a
    cleanup project
- Acceptance:
  - the repo has exactly one lint path, not overlapping formatter+linter style
    stacks
  - lint passes on the current tree without large waiver files
  - CI either runs the lint gate or the team records an explicit reason to keep
    it local-only for a while

## Explicit Non-Goals

- do not reopen the closed 2026-04-12 audit backlog just to move these items
  under audit labels
- do not add multiple maintenance tools at once
- do not introduce `lint-staged`, commit hooks, or dependency-pruning tooling
  until the narrow lint decision is settled
