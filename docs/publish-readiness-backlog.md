# Publish Readiness Backlog

This document tracks the work needed to restore a low-drama, repeatable publish path for the next
public package release.

Use this file as the working backlog for the next publish window. Keep
`docs/2026-04-13-follow-up-backlog.md` as historical context; the release-facing work from
`FUB-001` and `FUB-002` is intentionally absorbed here so the next publish can be managed from one
place.

## Current Position

- Publish cadence: cold
- Core validation and renderer hardening are in good shape, but the release path itself has not been
  exercised recently enough to trust muscle memory
- The next failure risk is more likely to be release-process drift than a missing product feature
- Shared release baseline now exists as `pnpm release:check`; the remaining publish-readiness work
  is package-boundary clarity and tarball verification

## Target Outcome

The next tag publish should be reproducible from a clean checkout, using only documented steps, with
the same confidence level as the main CI path.

More concretely:

- the publish workflow uses the same release baseline as the tested CI path, or any deliberate
  difference is explicit and justified
- maintainers can rehearse the release path before pushing a real `vX.Y.Z` tag
- package surface and tarball contents are verified before the next real publish
- release docs describe the actual procedure instead of a lighter historical shortcut

## Priority Model

- `P0`
  - must be complete before the next real tag publish
- `P1`
  - should land in the same publish-readiness window unless time pressure forces a split

## Summary

| ID      | Priority | Theme                                          | Status |
| ------- | -------- | ---------------------------------------------- | ------ |
| PRB-001 | P0       | Align publish workflow with the tested CI gate | Done   |
| PRB-002 | P0       | Add a clean-checkout release rehearsal path    | Done   |
| PRB-003 | P0       | Refresh and align release documentation        | Done   |
| PRB-004 | P1       | Define internal subpath stability for releases | Open   |
| PRB-005 | P1       | Verify tarball contents and exported surfaces  | Open   |

## PRB-001 — Align Publish Workflow With The Tested CI Gate

- Priority: `P0`
- Why this exists:
  - the current tag publish path does not exercise the same gate that the main CI path uses
  - a publish that passes only the lighter workflow still has a confidence gap relative to normal CI
- Evidence:
  - `.github/workflows/ci.yml:20-48` runs Node `20.19.0` plus `pnpm format:check`,
    `pnpm test:contracts`, `pnpm test:clean-checkout`, `pnpm build`, `pnpm -r exec tsc --noEmit`,
    `pnpm audit`, and `pnpm test:coverage`
  - `.github/workflows/publish.yml:24-40` runs Node `24`, `pnpm build`, `pnpm test:run`, and then
    publishes
  - `package.json:4-15` already defines the stronger contract-oriented release gates
- Required change:
  - choose one release baseline and make `publish.yml` match it, or make the publish path explicitly
    depend on an already-green workflow using the same baseline
  - stop leaving Node version drift and gate drift implicit
- Acceptance:
  - the publish path uses the same Node baseline as the tested CI path, or the difference is
    documented with a reason
  - the publish path either runs or hard-depends on the same contract gates that protect normal CI
  - release docs no longer describe a lighter path than the one actually trusted for publish
- Completion note (2026-04-13):
  - `.github/workflows/ci.yml` and `.github/workflows/publish.yml` now both call the same
    `pnpm release:check` baseline on Node `20.19.0`
  - the release baseline now lives in `package.json` instead of being duplicated across workflows

## PRB-002 — Add A Clean-Checkout Release Rehearsal Path

- Priority: `P0`
- Why this exists:
  - recent publish activity has been low enough that process memory is no longer a reliable control
  - the repo has strong validation commands, but there is no release-specific rehearsal flow that
    proves a maintainer can execute the next publish calmly from a fresh checkout
- Evidence:
  - `AGENTS.md:79-81` documents a short release flow of version bump → `pnpm build` →
    `pnpm test:run` → push release commit → push tag
  - `CLAUDE.md:72-75` carries extra release caveats, including a previous incorrect publish path
  - `package.json:4-15` has strong clean-checkout and contract scripts, but no release rehearsal
    command or named pre-tag verification path
- Required change:
  - define one pre-tag rehearsal path for maintainers to run from a clean checkout
  - the rehearsal should exercise the intended release baseline without performing the real publish
  - prefer a single named command or short checklist over tribal knowledge
- Acceptance:
  - a maintainer can run the release rehearsal from a clean checkout without unpublished side steps
  - the rehearsal proves the repo can build, test, and package successfully on the intended release
    baseline
  - the next real publish does not require inventing or remembering extra steps under pressure
- Completion note (2026-04-13):
  - the repo now exposes `pnpm release:check` as the named clean-checkout pre-tag rehearsal path
  - local rehearsal completed through format check, contract gate, clean-checkout gate, build,
    typecheck, audit, and coverage

## PRB-003 — Refresh And Align Release Documentation

- Priority: `P0`
- Why this exists:
  - release expectations are spread across multiple docs and currently emphasize the historical short
    flow more than the stronger tested gate
  - if the next publish is meant to be low-risk, the docs need to describe the real path exactly
- Evidence:
  - `AGENTS.md:8-9` and `CLAUDE.md:8-9` require README/tooling docs to stay aligned when workflow
    expectations change
  - `README.md:53-66` documents the stronger workspace commands, but `AGENTS.md:79-81` still
    describes a lighter typical release flow
  - `CLAUDE.md:68-75` contains extra publish guidance not mirrored everywhere else
- Required change:
  - document the exact pre-tag checklist and the exact role of the GitHub publish workflow
  - keep `README.md`, `AGENTS.md`, and `CLAUDE.md` aligned on release expectations
  - capture any deliberate shortcuts as explicit exceptions, not implied habits
- Acceptance:
  - there is one unambiguous pre-tag checklist
  - user-facing and tool-facing docs agree on the actual release path
  - the next publish can be executed by following docs rather than reconstructing history
- Completion note (2026-04-13):
  - `README.md`, `AGENTS.md`, and `CLAUDE.md` now all describe `pnpm release:check` as the shared
    pre-tag baseline and no longer document the lighter historical release path as the default

## PRB-004 — Define Internal Subpath Stability For Releases

- Priority: `P1`
- Why this exists:
  - the workspace now exports useful internal helpers, but the release contract for those exports is
    still implicit
  - the next publish should not silently widen the supported API surface by accident
- Evidence:
  - `packages/types/package.json:14-31` exports `./internal/style-semantics`,
    `./internal/style-output`, and `./internal/style-key-sets`
  - `README.md:21-27,209-217` explains package purpose and advanced low-level boundaries, but does
    not define a stability contract for `@safe-ugc-ui/types/internal/*`
  - `docs/2026-04-13-follow-up-backlog.md:61-89` already records this as open release-facing work
- Required change:
  - define whether the exported internal subpaths are workspace-only, unstable-but-available, or
    intentionally supported
  - document the rule before the next publish so versioning decisions are predictable
- Acceptance:
  - docs explicitly state the stability expectation for exported internal subpaths
  - maintainers have one clear rule for whether changes to those helpers require public API treatment
  - the next release does not leave external consumers guessing from `exports` alone

## PRB-005 — Verify Tarball Contents And Exported Surfaces Before Publish

- Priority: `P1`
- Why this exists:
  - a green test run does not prove that the published tarballs contain the right files or expose
    the intended package boundary
  - this matters more when publish cadence is low and internal exports already exist
- Evidence:
  - `packages/types/package.json:12-33`, `packages/validator/package.json:12-22`, and
    `packages/react/package.json:12-22` rely on `files` and `exports` for release surface control
  - `.github/workflows/publish.yml:31-40` publishes immediately after build and test without an
    explicit pack/surface verification step
  - `packages/schema` also publishes a generated schema artifact, which raises the cost of shipping
    the wrong build output
- Required change:
  - add a repeatable tarball verification step before the next real publish
  - verify `files`, `exports`, generated artifacts, and installability of the packed output
  - keep the check narrow and release-focused; this is not a general packaging overhaul
- Acceptance:
  - maintainers can inspect or automatically verify the tarball contents for each publishable package
  - the next release proves that generated outputs and exported entrypoints match intent
  - package boundary regressions are caught before npm, not after

## Exit Criteria

This backlog is ready to close when all of the following are true:

- the next release candidate can be rehearsed from a clean checkout
- the publish path and the trusted CI path are aligned enough that confidence no longer depends on
  memory
- release docs match the actual process
- package boundary expectations are explicit before the next public tag goes out

## Explicit Non-Goals

- do not turn this into a general maintainability backlog
- do not reopen already-closed production audit work unless a publish task truly depends on it
- do not replace npm trusted publishing with a different release model
- do not broaden scope into feature work unrelated to the next package publish
