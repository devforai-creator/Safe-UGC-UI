/**
 * @safe-ugc-ui/validator — Public API
 *
 * Provides four main entry points for card validation and safe ingest:
 *
 *   loadCardRaw(rawJson: string) — Recommended for raw JSON strings.
 *     Checks UTF-8 byte size BEFORE parsing, validates the full card,
 *     and returns the typed UGCCard on success.
 *
 *   loadCard(input: unknown) — For already-parsed objects.
 *     Validates the full card and returns the typed UGCCard on success.
 *
 *   validateRaw(rawJson: string) — Low-level diagnostics-only entry point
 *     for raw JSON strings. Checks UTF-8 byte size BEFORE parsing.
 *
 *   validate(input: unknown) — Low-level diagnostics-only entry point
 *     for already-parsed objects.
 *
 * Pipeline:
 *   1. (raw only) UTF-8 byte size check (1MB limit)
 *   2. (raw only) JSON.parse — parse error → ValidationResult
 *   3. Schema validation → fail → early return
 *   4. All remaining checks run, errors accumulated:
 *      node → value-types → style → security → limits
 */

import { CARD_JSON_MAX_BYTES, type UGCCard } from '@safe-ugc-ui/types';

import { type ValidationError, type ValidationResult, createError, toResult } from './result.js';
import { validateSchema, parseCard } from './schema.js';
import { validateFragments } from './fragment-validator.js';
import { validateNodes } from './node-validator.js';
import { validateConditions } from './condition-validator.js';
import { validateValueTypes } from './value-types.js';
import { validateStyles } from './style-validator.js';
import { validateSecurity } from './security.js';
import { validateLimits } from './limits.js';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  type ValidationError,
  type ValidationErrorCode,
  type ValidationResult,
  createError,
  validResult,
  invalidResult,
  toResult,
  merge,
} from './result.js';

export {
  type StyleResolver,
  type TraversalContext,
  type TraversableNode,
  type NodeVisitor,
  traverseNode,
  traverseCard,
} from './traverse.js';

export { validateSchema, parseCard } from './schema.js';
export { validateFragments } from './fragment-validator.js';
export { validateNodes } from './node-validator.js';
export { validateConditions } from './condition-validator.js';
export { validateValueTypes } from './value-types.js';
export { validateStyles } from './style-validator.js';
export { validateSecurity } from './security.js';
export { validateLimits } from './limits.js';

export type LoadedCardResult =
  | { valid: true; errors: []; card: UGCCard }
  | { valid: false; errors: ValidationError[]; card: null };

// ---------------------------------------------------------------------------
// UTF-8 byte length (platform-agnostic)
// ---------------------------------------------------------------------------

function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

type RawParseResult = { ok: true; parsed: unknown } | { ok: false; errors: ValidationError[] };

function parseRawJsonInput(rawJson: string): RawParseResult {
  const byteSize = utf8ByteLength(rawJson);
  if (byteSize > CARD_JSON_MAX_BYTES) {
    return {
      ok: false,
      errors: [
        createError(
          'CARD_SIZE_EXCEEDED',
          `Card JSON is ${byteSize} bytes, maximum is ${CARD_JSON_MAX_BYTES} bytes.`,
          '',
        ),
      ],
    };
  }

  try {
    return {
      ok: true,
      parsed: JSON.parse(rawJson),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return {
      ok: false,
      errors: [createError('INVALID_JSON', `Failed to parse JSON: ${message}`, '')],
    };
  }
}

// ---------------------------------------------------------------------------
// runAllChecks — shared pipeline (post-schema)
// ---------------------------------------------------------------------------

function runAllChecks(input: unknown): ValidationError[] {
  const obj = input as {
    views: Record<string, unknown>;
    state?: Record<string, unknown>;
    assets?: Record<string, string>;
    styles?: Record<string, Record<string, unknown>>;
    fragments?: Record<string, unknown>;
  };
  const views = obj.views as Record<string, unknown>;
  const cardStyles = obj.styles as Record<string, Record<string, unknown>> | undefined;
  const fragments = obj.fragments as Record<string, unknown> | undefined;
  const errors: ValidationError[] = [];

  errors.push(...validateFragments(views, fragments));
  errors.push(...validateNodes(views, fragments));
  errors.push(...validateConditions(views, fragments));
  errors.push(...validateValueTypes(views, fragments));
  errors.push(...validateStyles(views, cardStyles, fragments));
  errors.push(
    ...validateSecurity({
      views,
      state: obj.state as Record<string, unknown> | undefined,
      cardAssets: obj.assets as Record<string, string> | undefined,
      cardStyles,
      fragments,
    }),
  );
  errors.push(
    ...validateLimits({
      state: obj.state as Record<string, unknown> | undefined,
      views,
      cardStyles,
      fragments,
    }),
  );

  return errors;
}

function toLoadedCardResult(validationResult: ValidationResult, input: unknown): LoadedCardResult {
  if (!validationResult.valid) {
    return {
      valid: false,
      errors: validationResult.errors,
      card: null,
    };
  }

  const card = parseCard(input);
  if (card == null) {
    return {
      valid: false,
      errors: [
        createError(
          'SCHEMA_ERROR',
          'Card could not be parsed into a typed UGCCard after validation.',
          '',
        ),
      ],
      card: null,
    };
  }

  return {
    valid: true,
    errors: [],
    card,
  };
}

// ---------------------------------------------------------------------------
// validate — object input (already parsed)
// ---------------------------------------------------------------------------

/**
 * Validate an already-parsed card object.
 *
 * Skips the JSON byte size check (use `validateRaw` for raw strings).
 *
 * Pipeline:
 *   1. Schema validation → fail → early return
 *   2. All remaining checks (node, value-types, style, security, limits)
 *
 * @param input - An unknown value (typically parsed JSON).
 * @returns A ValidationResult — safe to render only if `valid` is true.
 */
export function validate(input: unknown): ValidationResult {
  // 1. Schema validation (early return on failure)
  const schemaResult = validateSchema(input);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  // 2. All remaining checks
  const errors = runAllChecks(input);
  return toResult(errors);
}

/**
 * Validate an already-parsed card object and return the typed card on success.
 *
 * Recommended import-time entry point when the host already parsed the input.
 */
export function loadCard(input: unknown): LoadedCardResult {
  return toLoadedCardResult(validate(input), input);
}

// ---------------------------------------------------------------------------
// validateRaw — string input (pre-parse size check)
// ---------------------------------------------------------------------------

/**
 * Validate a raw JSON string and return diagnostics only.
 *
 * Checks the byte size of the raw string BEFORE parsing to prevent
 * JSON parsing DoS with oversized payloads.
 *
 * Pipeline:
 *   1. UTF-8 byte size check (1MB max) → reject without parsing
 *   2. JSON.parse → parse error → ValidationResult (no throw)
 *   3. Schema validation → fail → early return
 *   4. All remaining checks
 *
 * @param rawJson - A raw JSON string representing a UGC card.
 * @returns A ValidationResult — safe to render only if `valid` is true.
 */
export function validateRaw(rawJson: string): ValidationResult {
  const rawParseResult = parseRawJsonInput(rawJson);
  if (!rawParseResult.ok) {
    return toResult(rawParseResult.errors);
  }

  // 3-4. Delegate to validate()
  return validate(rawParseResult.parsed);
}

/**
 * Validate a raw JSON string, returning the typed card on success.
 *
 * Recommended import-time entry point for untrusted JSON input because it
 * applies the pre-parse size guard before JSON.parse.
 */
export function loadCardRaw(rawJson: string): LoadedCardResult {
  const rawParseResult = parseRawJsonInput(rawJson);
  if (!rawParseResult.ok) {
    return {
      valid: false,
      errors: rawParseResult.errors,
      card: null,
    };
  }

  return loadCard(rawParseResult.parsed);
}
