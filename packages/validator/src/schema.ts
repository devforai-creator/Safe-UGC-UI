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

function formatIssuePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '';
  }

  let result = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`;
      continue;
    }

    const key = typeof segment === 'symbol' ? String(segment) : segment;
    result += result.length === 0 ? key : `.${key}`;
  }

  return result;
}

type IssueLike = {
  code?: string;
  message: string;
  path: readonly PropertyKey[];
  errors?: Array<Array<{
    code?: string;
    message: string;
    path: readonly PropertyKey[];
    errors?: IssueLike['errors'];
    issues?: IssueLike[];
  }>>;
  issues?: IssueLike[];
};

/**
 * Expand nested Zod 4 issues into leaf diagnostics with fully qualified paths.
 *
 * This helper is exported for package-local tests, but it is not re-exported
 * from the package entrypoint.
 */
export function collectNestedIssues(
  issue: IssueLike,
  parentPath: readonly PropertyKey[] = [],
): Array<{
  path: readonly PropertyKey[];
  message: string;
}> {
  const fullPath = [...parentPath, ...issue.path];

  if (issue.code === 'invalid_union' && issue.errors) {
    return issue.errors.flatMap((unionIssues) =>
      unionIssues.flatMap((unionIssue) => collectNestedIssues(unionIssue, fullPath)),
    );
  }

  if ((issue.code === 'invalid_key' || issue.code === 'invalid_element') && issue.issues) {
    return issue.issues.flatMap((nestedIssue) => collectNestedIssues(nestedIssue, fullPath));
  }

  return [{ path: fullPath, message: issue.message }];
}

function formatIssueMessage(issue: IssueLike): string {
  if (issue.code !== 'invalid_union' || !issue.errors) {
    return issue.message;
  }

  const nested = collectNestedIssues(issue)
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
 * For nested Zod union/container failures, this keeps a single `SCHEMA_ERROR`
 * at the nearest stable ancestor path and appends up to three deeper child
 * locations to `message`.
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
