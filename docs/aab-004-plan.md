# AAB-004 Plan — Shared Style, Responsive, And Limit Semantics

This document defines the execution plan for `AAB-004` from
`docs/2026-04-12-audit-backlog.md`.

## Current Status

- `AAB-004a` landed on `2026-04-13`.
- Shared style merge and responsive semantics now live in
  `packages/types/src/internal/style-semantics.ts`.
- Shared semantic matrix tests now live in
  `packages/types/src/internal/style-semantics.test.ts`.
- `AAB-004b` landed on `2026-04-13`.
- Shared render-output style mapping and CSS byte counting now live in
  `packages/types/src/internal/style-output.ts`.
- Validator style budgets now measure renderer-equivalent CSS output per
  responsive mode and compare the worst-case mode against the global limit.
- `AAB-004c` initial capability-registry slice landed on `2026-04-13`.
- Shared capability lists now live in `packages/types/src/constants.ts` for:
  - directly renderable style properties
  - responsive-forbidden style keys
  - transition easing keywords
- Shared allowed-key registries now live in
  `packages/types/src/internal/style-key-sets.ts` and feed validator-side
  style, hover-style, responsive-style, and text-span key validation.
- `AAB-004` is complete as of `2026-04-13`.

## Goal

Reduce duplicated author-facing DSL semantics across validator and renderer
without changing the public package boundaries or weakening the current
production gate.

The target is not "share more code" in the abstract. The target is to move the
highest-risk duplicated semantics behind a single internal source of truth so a
future rule change does not require parallel edits in multiple packages.

## Non-Goals

- Do not change public package names, exports, or release workflow.
- Do not create a new published workspace package just for shared internals.
- Do not merge validator-only concerns and renderer-only concerns into one
  abstraction when the semantics are not actually identical yet.
- Do not rewrite the entire style system in one pass.

## Current Duplication Clusters

### Cluster A — `$style` and responsive merge semantics

These files currently carry overlapping merge rules:

- `packages/validator/src/responsive-utils.ts`
- `packages/react/src/node-renderer.tsx`

Observed overlap:

- named style resolution
- inline override precedence
- `medium` / `compact` merge order
- responsive-only stripping of `hoverStyle` and `transition`

Observed drift already exists:

- validator strips an unresolved `$style` key when the named style is missing
- renderer currently returns the original style object when the named style is
  missing

This is the best first extraction target because the semantics are already
close, the API surface is small, and the risk is concentrated.

### Cluster B — resolved text/style byte counting

These files currently carry related but not yet identical counting rules:

- `packages/validator/src/limits.ts`
- `packages/react/src/node-renderer.tsx`

Observed overlap:

- UTF-8 byte counting
- resolved text byte counting
- style byte accounting
- overflow counting tied to effective style resolution

Important caveat:

- validator currently counts serialized resolved DSL-like style objects
- renderer currently counts mapped CSS objects

This cluster should not be extracted first because the semantic contract is not
fully agreed yet.

### Cluster C — style-property meaning registry

These files currently encode overlapping property meaning in different forms:

- `packages/validator/src/style-validator.ts`
- `packages/react/src/style-mapper.ts`

Observed overlap:

- property existence and allowed shape
- responsive restrictions
- transform/shadow/gradient/transition capability assumptions

This is the most strategic cluster and the riskiest one to over-scope.

## Recommended Execution Order

1. `AAB-004a` — shared style merge and responsive semantics
2. `AAB-004b` — shared counting primitives after semantics are clarified
3. `AAB-004c` — style-property capability registry

Do not start `004b` or `004c` until `004a` is finished and stable.

## AAB-004a — First Slice

### Scope

Extract the following semantics into one shared internal helper layer:

- resolve named `$style` references
- strip `$style` after merge
- read `responsive.medium` / `responsive.compact`
- merge default, medium, and compact styles in one canonical order
- strip responsive-only unsupported fields from responsive overrides

### Proposed Internal Location

Use a narrow internal module under `@safe-ugc-ui/types`, for example:

- `packages/types/src/internal/style-semantics.ts`

Rationale:

- both validator and renderer already depend on `@safe-ugc-ui/types`
- this avoids introducing a new workspace package into the publish graph
- this keeps the shared layer internal and close to the DSL definition package

This helper should not be re-exported from the public package barrel unless a
later use case proves that external consumers need it.

### Proposed Helper Surface

The exact names can change, but the shared layer should roughly provide:

- `mergeNamedStyleRef(style, cardStyles)`
- `getResponsiveStyleOverride(nodeOrResponsive, mode)`
- `stripResponsiveUnsupportedFields(style)`
- `getEffectiveStyleForMode(style, responsive, cardStyles, mode)`

The helper should operate on plain record-like inputs and remain independent of
React and validator error types.

### Required Decisions Before Implementation

1. Missing `$style` behavior

Current code is not fully aligned when a named style is missing. Pick one rule
and use it everywhere:

- preferred rule: remove `$style` and preserve the remaining inline keys

This matches the validator helper today and is easier to reason about.

2. Responsive override behavior

Keep the existing contract:

- responsive overrides may not contribute `hoverStyle`
- responsive overrides may not contribute `transition`
- compact overrides apply on top of medium overrides

3. Hover style merge behavior

Keep hover-style merging only at the base style level for `004a`.
Do not expand the scope to nested hover semantics beyond what already exists.

### Test Strategy

Add focused shared-semantic tests before moving production code.

Minimum matrix:

- `$style` resolves and inline keys win
- missing `$style` preserves inline keys and drops `$style`
- `medium` merges on top of base
- `compact` merges on top of `medium`
- responsive `hoverStyle` is stripped
- responsive `transition` is stripped
- base `hoverStyle` still survives merge

Then adapt validator and renderer tests to assert behavior through that matrix,
not through duplicated local helper logic.

### Exit Criteria

- validator and renderer both call the same helper for merge semantics
- there is one agreed behavior for missing `$style`
- a representative responsive-style rule change requires editing one semantic
  helper instead of both packages

## AAB-004b — Counting Semantics

### Scope

Only begin after `004a` lands.

Candidates:

- shared `utf8ByteLength`
- shared text-value byte counting primitives
- shared "effective style to count" policy

### Locked Decision

`AAB-004b` will align validator-side style accounting to the renderer contract.

The semantic target is:

- mapped CSS output after renderer transformation
- counted from the effective merged style for the active responsive mode
- measured as UTF-8 bytes of the JSON-serialized resolved CSS object

This decision intentionally rejects the older validator behavior of counting:

- unresolved-or-DSL-like style objects before CSS mapping
- default style plus `medium` / `compact` override branches as separate totals

### Detailed Rules

1. Runtime renderer rule

- count only the currently active mode: `default`, `medium`, or `compact`
- count the effective merged node style for that mode once
- count mapped `hoverStyle` for that effective base style in the same mode
- count mapped `Text.spans[*].style` output using the same CSS-based metric

2. Validator preflight rule

- compute style totals independently for `default`, `medium`, and `compact`
- for each mode, measure the resolved render output that the renderer would
  produce for that mode
- reject the card if any mode exceeds the global style-byte budget

3. Aggregation rule

- do not sum authored responsive branches on top of each other as separate
  budget entries
- do not count the same base style twice when evaluating a responsive mode
- compare modes by worst-case final output, not by authored branch volume

### Rationale

- The spec and repo docs already say style budgets apply to resolved render
  output, not authored literals.
- The renderer already enforces limits against mapped CSS output for the active
  mode.
- A validator that sums authored branches can reject or accept cards for the
  wrong reason because authored DSL volume is not the same thing as final CSS
  payload.

### Locked Test Coverage

`004b` now has direct coverage for the following behaviors:

- runtime limits use mapped CSS byte size, not raw DSL byte size
- runtime limits count only the currently active responsive mode
- runtime limits count the effective responsive style once, not base-plus-branch
  as separate style entries

### Exit Criteria

- validator and renderer count against an explicitly documented semantic target
- shared low-level counting functions exist only for the parts that are truly
  identical

## AAB-004c — Style Capability Registry

### Scope

Move toward a central registry for property capability metadata, not a full
validator/renderer merger.

Likely candidates:

- direct-map property list
- responsive forbidden-property list
- text-span allowed-property list
- transition-capable property metadata

### Warning

This slice should be incremental. If the implementation starts looking like a
schema rewrite, the scope is too large.

### Current Progress

The first `004c` slice is landed:

- `DIRECT_RENDERABLE_STYLE_PROPERTIES` is now shared by constants and the
  render-output mapper
- `ALLOWED_TRANSITION_PROPERTIES` is now derived from that shared property list
- `ALLOWED_TRANSITION_EASINGS` is now shared by the schema and renderer mapping
- `RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES` is now shared by responsive
  normalization and validator-side responsive validation
- enum/value-domain lists for display, flex alignment, overflow, position,
  object-fit, and border-style are now shared between schema definitions and
  the render-output mapper
- `LENGTH_AUTO_STYLE_PROPERTIES` is now shared between validator and
  render-output normalization
- `TEXT_SPAN_STYLE_PROPERTIES`, `COLOR_STYLE_PROPERTIES`,
  `LENGTH_STYLE_PROPERTIES`, and `RANGE_LIMITED_LENGTH_STYLE_PROPERTIES` are
  now shared between `types` constants and validator-side style validation

Residual validator-local sets are now implementation helpers, not duplicated
author-facing DSL registries:

- `Set` wrappers such as `STYLE_ALLOWED_KEYS` and `COLOR_PROPERTIES` are now
  thin lookup caches over shared constants or shared internal key lists
- `STRUCTURED_FIELDS` remains local because it is a per-call validation option
  set, not a reusable DSL capability definition

### Exit Criteria

- at least one meaningful property capability list is shared
- adding or deprecating a style property no longer requires manual list updates
  in multiple high-risk files

## Delivery Sequence

### Step 1 — Planning and locking behavior

- create this plan
- add shared-semantic matrix tests
- resolve the missing-`$style` rule explicitly

### Step 2 — Land `004a`

- introduce the shared internal helper
- switch validator to it
- switch renderer to it
- keep the refactor behavior-preserving except for the explicitly chosen
  missing-`$style` rule

### Step 3 — Re-evaluate

After `004a`, stop and measure:

- how much duplicated code remains
- whether the remaining duplication is truly semantic or only implementation
  detail
- whether `004b` should be split again before coding

## Review Checklist

Before merging any `AAB-004` slice, confirm:

- no public package export changed unintentionally
- no new workspace publish dependency was introduced
- `pnpm test:contracts` still passes
- `pnpm test:clean-checkout` still passes
- the new shared helper has direct tests of its own
- the change removed semantic duplication, not just moved it

## Definition Of Done For AAB-004

`AAB-004` should be considered done only when:

- at least the style merge semantics are shared
- the remaining duplicated clusters are either removed or explicitly documented
  as intentionally separate
- a representative DSL rule change demonstrably touches fewer high-risk files
  than it does today

Status:

- complete on `2026-04-13`
- the remaining validator-local collections are intentionally separate
  implementation details rather than duplicated cross-package semantics
