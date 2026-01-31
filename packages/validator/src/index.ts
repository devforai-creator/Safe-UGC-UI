/**
 * @safe-ugc-ui/validator — Public API
 *
 * Provides two entry points for card validation:
 *
 *   validateRaw(rawJson: string) — Recommended for raw JSON strings.
 *     Checks UTF-8 byte size BEFORE parsing. If too large, rejects without
 *     parsing (DoS prevention). Returns ValidationResult.
 *
 *   validate(input: unknown) — For already-parsed objects.
 *     Skips size check. Returns ValidationResult.
 *
 * Pipeline:
 *   1. (validateRaw only) UTF-8 byte size check (1MB limit)
 *   2. (validateRaw only) JSON.parse — parse error → ValidationResult
 *   3. Schema validation → fail → early return
 *   4. All remaining checks run, errors accumulated:
 *      node → value-types → style → security → limits → expr-constraints
 */

import { CARD_JSON_MAX_BYTES } from '@safe-ugc-ui/types';

import {
  type ValidationError,
  type ValidationResult,
  createError,
  toResult,
} from './result.js';
import { validateSchema } from './schema.js';
import { validateNodes } from './node-validator.js';
import { validateValueTypes } from './value-types.js';
import { validateStyles } from './style-validator.js';
import { validateSecurity } from './security.js';
import { validateLimits } from './limits.js';
import { validateExprConstraints } from './expr-constraints.js';

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
  type TraversalContext,
  type TraversableNode,
  type NodeVisitor,
  traverseNode,
  traverseCard,
} from './traverse.js';

export { validateSchema, parseCard } from './schema.js';
export { validateNodes } from './node-validator.js';
export { validateValueTypes } from './value-types.js';
export { validateStyles } from './style-validator.js';
export { validateSecurity } from './security.js';
export { validateLimits } from './limits.js';
export { validateExprConstraints } from './expr-constraints.js';

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

// ---------------------------------------------------------------------------
// runAllChecks — shared pipeline (post-schema)
// ---------------------------------------------------------------------------

function runAllChecks(input: unknown): ValidationError[] {
  const obj = input as {
    views: Record<string, unknown>;
    state?: Record<string, unknown>;
    assets?: Record<string, string>;
  };
  const views = obj.views as Record<string, unknown>;
  const errors: ValidationError[] = [];

  errors.push(...validateNodes(views));
  errors.push(...validateValueTypes(views));
  errors.push(...validateStyles(views));
  errors.push(...validateSecurity({
    views,
    state: obj.state as Record<string, unknown> | undefined,
    cardAssets: obj.assets as Record<string, string> | undefined,
  }));
  errors.push(...validateLimits({ state: obj.state as Record<string, unknown> | undefined, views }));
  errors.push(...validateExprConstraints(views));

  return errors;
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
 *   2. All remaining checks (node, value-types, style, security, limits, expr)
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

// ---------------------------------------------------------------------------
// validateRaw — string input (pre-parse size check)
// ---------------------------------------------------------------------------

/**
 * Validate a raw JSON string. Recommended entry point.
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
  // 1. Pre-parse size check
  const byteSize = utf8ByteLength(rawJson);
  if (byteSize > CARD_JSON_MAX_BYTES) {
    return toResult([
      createError(
        'CARD_SIZE_EXCEEDED',
        `Card JSON is ${byteSize} bytes, maximum is ${CARD_JSON_MAX_BYTES} bytes.`,
        '',
      ),
    ]);
  }

  // 2. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return toResult([
      createError('INVALID_JSON', `Failed to parse JSON: ${message}`, ''),
    ]);
  }

  // 3-4. Delegate to validate()
  return validate(parsed);
}
