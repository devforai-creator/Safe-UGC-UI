/**
 * @safe-ugc-ui/validator — Schema (Structural) Validation
 *
 * Verifies the top-level structure of a UGC card:
 *   - Required fields: meta (name, version), views (at least one)
 *   - Zod schema parse for the full card structure
 *   - Maps Zod parse errors to ValidationError format
 *
 * This is the first step in the validation pipeline (after size check).
 * If structural validation fails, no further checks are performed.
 */

import { ugcCardSchema, type UGCCard } from '@safe-ugc-ui/types';

import {
  type ValidationError,
  type ValidationResult,
  createError,
  toResult,
} from './result.js';

// ---------------------------------------------------------------------------
// validateSchema
// ---------------------------------------------------------------------------

/**
 * Validate the structural shape of a card using the Zod schema.
 *
 * @param input - An unknown value (already parsed from JSON).
 * @returns A ValidationResult. If valid, the parsed UGCCard can be accessed
 *          from the Zod result; callers should re-parse if they need the typed object.
 */
export function validateSchema(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Quick structural pre-checks for better error messages
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.push(
      createError('SCHEMA_ERROR', 'Card must be a plain object.', ''),
    );
    return toResult(errors);
  }

  const obj = input as Record<string, unknown>;

  // Check required top-level fields before full Zod parse
  if (!obj.meta) {
    errors.push(
      createError('MISSING_FIELD', 'Card is missing required field "meta".', 'meta'),
    );
  }
  if (!obj.views) {
    errors.push(
      createError('MISSING_FIELD', 'Card is missing required field "views".', 'views'),
    );
  }

  // If critical fields are missing, return early
  if (errors.length > 0) {
    return toResult(errors);
  }

  // Check meta structure
  if (typeof obj.meta !== 'object' || obj.meta === null) {
    errors.push(
      createError('INVALID_TYPE', '"meta" must be an object.', 'meta'),
    );
    return toResult(errors);
  }

  const meta = obj.meta as Record<string, unknown>;
  if (typeof meta.name !== 'string') {
    errors.push(
      createError('MISSING_FIELD', '"meta.name" is required and must be a string.', 'meta.name'),
    );
  }
  if (typeof meta.version !== 'string') {
    errors.push(
      createError('MISSING_FIELD', '"meta.version" is required and must be a string.', 'meta.version'),
    );
  }

  // Check views structure
  if (typeof obj.views !== 'object' || obj.views === null || Array.isArray(obj.views)) {
    errors.push(
      createError('INVALID_TYPE', '"views" must be an object.', 'views'),
    );
    return toResult(errors);
  }

  const views = obj.views as Record<string, unknown>;
  if (Object.keys(views).length === 0) {
    errors.push(
      createError('MISSING_FIELD', '"views" must contain at least one view.', 'views'),
    );
  }

  // If pre-checks found issues, return them
  if (errors.length > 0) {
    return toResult(errors);
  }

  // Full Zod parse
  const result = ugcCardSchema.safeParse(input);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors.push(
        createError('SCHEMA_ERROR', issue.message, path),
      );
    }
  }

  return toResult(errors);
}

/**
 * Parse a card from an unknown input, returning either the typed UGCCard
 * or null if structural validation fails.
 *
 * Callers should first run `validateSchema()` to get user-facing errors.
 * This is a convenience for subsequent pipeline stages that need the typed card.
 */
export function parseCard(input: unknown): UGCCard | null {
  const result = ugcCardSchema.safeParse(input);
  return result.success ? result.data : null;
}
