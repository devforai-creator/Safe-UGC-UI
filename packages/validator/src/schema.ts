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

function formatIssuePath(path: Array<string | number>): string {
  if (path.length === 0) {
    return '';
  }

  let result = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`;
      continue;
    }

    result += result.length === 0 ? segment : `.${segment}`;
  }

  return result;
}

function formatIssueMessage(issue: {
  code?: string;
  message: string;
  unionErrors?: Array<{
    issues: Array<{
      path: Array<string | number>;
      message: string;
    }>;
  }>;
}): string {
  if (issue.code !== 'invalid_union' || !issue.unionErrors) {
    return issue.message;
  }

  const nested = issue.unionErrors
    .flatMap((unionError) => unionError.issues)
    .slice(0, 3)
    .map((nestedIssue) => {
      const nestedPath = formatIssuePath(nestedIssue.path);
      return nestedPath.length > 0
        ? `${nestedPath}: ${nestedIssue.message}`
        : nestedIssue.message;
    });

  if (nested.length === 0) {
    return issue.message;
  }

  return `${issue.message} (${nested.join('; ')})`;
}

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
      const path = formatIssuePath(issue.path);
      errors.push(
        createError('SCHEMA_ERROR', formatIssueMessage(issue), path),
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
