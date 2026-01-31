/**
 * @safe-ugc-ui/validator — Validation Result Types
 *
 * Provides the error and result types used throughout the validation pipeline.
 *
 * Design decisions:
 *   - Errors include a `path` for precise location in the card tree.
 *   - Errors include a `code` for programmatic handling.
 *   - `merge()` combines multiple results, accumulating all errors.
 *   - A valid result is simply `{ valid: true, errors: [] }`.
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * Machine-readable error codes for every validation failure type.
 */
export type ValidationErrorCode =
  // Schema / structural
  | 'INVALID_JSON'
  | 'MISSING_FIELD'
  | 'INVALID_TYPE'
  | 'INVALID_VALUE'
  | 'UNKNOWN_NODE_TYPE'
  | 'SCHEMA_ERROR'
  // Value-type restrictions
  | 'EXPR_NOT_ALLOWED'
  | 'REF_NOT_ALLOWED'
  | 'DYNAMIC_NOT_ALLOWED'
  // Style
  | 'FORBIDDEN_STYLE_PROPERTY'
  | 'STYLE_VALUE_OUT_OF_RANGE'
  | 'FORBIDDEN_CSS_FUNCTION'
  | 'INVALID_COLOR'
  | 'INVALID_LENGTH'
  | 'FORBIDDEN_OVERFLOW_VALUE'
  | 'TRANSFORM_SKEW_FORBIDDEN'
  // Security
  | 'EXTERNAL_URL'
  | 'POSITION_FIXED_FORBIDDEN'
  | 'POSITION_STICKY_FORBIDDEN'
  | 'POSITION_ABSOLUTE_NOT_IN_STACK'
  | 'ASSET_PATH_TRAVERSAL'
  | 'INVALID_ASSET_PATH'
  | 'PROTOTYPE_POLLUTION'
  // Limits
  | 'CARD_SIZE_EXCEEDED'
  | 'TEXT_CONTENT_SIZE_EXCEEDED'
  | 'STYLE_SIZE_EXCEEDED'
  | 'NODE_COUNT_EXCEEDED'
  | 'LOOP_ITERATIONS_EXCEEDED'
  | 'NESTED_LOOPS_EXCEEDED'
  | 'OVERFLOW_AUTO_COUNT_EXCEEDED'
  | 'OVERFLOW_AUTO_NESTED'
  | 'STACK_NESTING_EXCEEDED'
  // Expression constraints
  | 'EXPR_TOO_LONG'
  | 'REF_TOO_LONG'
  | 'EXPR_TOO_MANY_TOKENS'
  | 'EXPR_NESTING_TOO_DEEP'
  | 'EXPR_CONDITION_NESTING_TOO_DEEP'
  | 'EXPR_REF_DEPTH_EXCEEDED'
  | 'EXPR_ARRAY_INDEX_EXCEEDED'
  | 'EXPR_STRING_LITERAL_TOO_LONG'
  | 'EXPR_FORBIDDEN_TOKEN'
  | 'EXPR_FUNCTION_CALL'
  | 'EXPR_INVALID_TOKEN'
  // ForLoop
  | 'LOOP_SOURCE_NOT_ARRAY'
  | 'LOOP_SOURCE_MISSING'
  // $style references
  | 'STYLE_CIRCULAR_REF'
  | 'STYLE_REF_NOT_FOUND'
  | 'INVALID_STYLE_REF'
  | 'INVALID_STYLE_NAME';

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

/**
 * A single validation error with location and diagnostic info.
 */
export interface ValidationError {
  /** Machine-readable error code. */
  code: ValidationErrorCode;

  /** Human-readable error message. */
  message: string;

  /**
   * JSON-pointer-like path to the error location.
   * e.g. `"views.StatusWindow.children[0].style.zIndex"`
   */
  path: string;
}

// ---------------------------------------------------------------------------
// ValidationResult
// ---------------------------------------------------------------------------

/**
 * The result of running the validation pipeline.
 *
 * - `valid: true`  → the card is safe to render.
 * - `valid: false` → the card has errors; do NOT render.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Create a single validation error.
 */
export function createError(
  code: ValidationErrorCode,
  message: string,
  path: string,
): ValidationError {
  return { code, message, path };
}

/**
 * Create a valid result (no errors).
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Create an invalid result from a list of errors.
 */
export function invalidResult(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * Wrap errors into a ValidationResult (valid if no errors).
 */
export function toResult(errors: ValidationError[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple validation results into one.
 * The merged result is valid only if ALL inputs are valid.
 */
export function merge(...results: ValidationResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  for (const r of results) {
    errors.push(...r.errors);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
