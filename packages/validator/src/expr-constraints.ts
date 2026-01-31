/**
 * @safe-ugc-ui/validator -- Expression & Reference Constraint Validation
 *
 * Validates $expr and $ref values found in the card tree against the
 * constraints defined in the spec's "expression constraint" section (6.3).
 *
 * A simple tokenizer splits expression strings into typed tokens so that
 * structural limits (nesting, token count, forbidden operators) can be
 * checked without executing the expression.
 */

import {
  EXPR_MAX_LENGTH,
  EXPR_MAX_TOKENS,
  EXPR_MAX_NESTING,
  EXPR_MAX_CONDITION_NESTING,
  EXPR_MAX_REF_DEPTH,
  EXPR_MAX_ARRAY_INDEX,
  EXPR_MAX_STRING_LITERAL,
  EXPR_MAX_FRACTIONAL_DIGITS,
  isRef,
  isExpr,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { type TraversableNode, type TraversalContext, traverseCard } from './traverse.js';

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type TokenType =
  | 'identifier'
  | 'number'
  | 'string'
  | 'boolean'
  | 'arithmetic'
  | 'comparison'
  | 'logic_keyword'
  | 'condition_keyword'
  | 'separator';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ---------------------------------------------------------------------------
// Forbidden tokens
// ---------------------------------------------------------------------------

const FORBIDDEN_KEYWORDS = [
  'typeof',
  'instanceof',
  'new',
  'delete',
  'function',
  'return',
  'var',
  'let',
  'const',
] as const;

const FORBIDDEN_KEYWORD_SET = new Set<string>(FORBIDDEN_KEYWORDS);

// ---------------------------------------------------------------------------
// Prototype pollution segments
// ---------------------------------------------------------------------------

const PROTOTYPE_POLLUTION_SEGMENTS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

function tokenize(
  expr: string,
  path: string,
): { tokens: Token[]; errors: ValidationError[] } {
  const tokens: Token[] = [];
  const errors: ValidationError[] = [];
  let i = 0;

  while (i < expr.length) {
    // 1. Skip whitespace
    if (/\s/.test(expr[i])) {
      i++;
      continue;
    }

    // 2. Three-char operators (must check before two-char)
    if (i + 2 < expr.length) {
      const three = expr.slice(i, i + 3);
      if (three === '===' || three === '!==') {
        tokens.push({ type: 'comparison', value: three, position: i });
        i += 3;
        continue;
      }
    }

    // 3. Two-char operators
    if (i + 1 < expr.length) {
      const two = expr.slice(i, i + 2);
      if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
        tokens.push({ type: 'comparison', value: two, position: i });
        i += 2;
        continue;
      }
      if (two === '&&' || two === '||') {
        tokens.push({ type: 'logic_keyword', value: two, position: i });
        i += 2;
        continue;
      }
    }

    // 4. String literals
    if (expr[i] === "'" || expr[i] === '"') {
      const quote = expr[i];
      let j = i + 1;
      while (j < expr.length && expr[j] !== quote) {
        // Allow escaped quotes
        if (expr[j] === '\\' && j + 1 < expr.length) {
          j += 2;
        } else {
          j++;
        }
      }
      // j now points to the closing quote (or end of string)
      const innerValue = expr.slice(i + 1, j);
      tokens.push({ type: 'string', value: innerValue, position: i });
      i = j + 1;
      continue;
    }

    // 5. Numbers: optional leading `-` for negative, digits, optional `.` + digits
    //    Only treat `-` as part of a number if:
    //      - it's at the start of the expression, OR
    //      - the previous non-whitespace token is NOT a number, identifier, string,
    //        boolean, or closing separator (i.e. it follows an operator or opening paren)
    if (/[0-9]/.test(expr[i]) || (expr[i] === '-' && i + 1 < expr.length && /[0-9]/.test(expr[i + 1]) && isNegativeSign(tokens))) {
      let j = i;
      if (expr[j] === '-') j++;
      while (j < expr.length && /[0-9]/.test(expr[j])) j++;
      if (j < expr.length && expr[j] === '.') {
        j++;
        while (j < expr.length && /[0-9]/.test(expr[j])) j++;
      }
      const numStr = expr.slice(i, j);
      // Check fractional digits
      const dotIdx = numStr.indexOf('.');
      if (dotIdx !== -1) {
        const fractionalPart = numStr.slice(dotIdx + 1);
        if (fractionalPart.length > EXPR_MAX_FRACTIONAL_DIGITS) {
          errors.push(
            createError(
              'EXPR_INVALID_TOKEN',
              `Number literal "${numStr}" at position ${i} has ${fractionalPart.length} fractional digits, maximum is ${EXPR_MAX_FRACTIONAL_DIGITS}.`,
              path,
            ),
          );
        }
      }
      tokens.push({ type: 'number', value: numStr, position: i });
      i = j;
      continue;
    }

    // 6. Identifiers: `$` followed by word chars, or plain word chars
    if (expr[i] === '$' || /[a-zA-Z_]/.test(expr[i])) {
      let j = i;
      if (expr[j] === '$') j++;
      while (j < expr.length && /[\w]/.test(expr[j])) j++;
      const word = expr.slice(i, j);

      if (word === 'true' || word === 'false') {
        tokens.push({ type: 'boolean', value: word, position: i });
      } else if (word === 'and' || word === 'or' || word === 'not') {
        tokens.push({ type: 'logic_keyword', value: word, position: i });
      } else if (word === 'if' || word === 'then' || word === 'else') {
        tokens.push({ type: 'condition_keyword', value: word, position: i });
      } else {
        tokens.push({ type: 'identifier', value: word, position: i });
      }
      i = j;
      continue;
    }

    // 7. Single-char operators and separators
    const ch = expr[i];
    if ('+-*/%'.includes(ch)) {
      tokens.push({ type: 'arithmetic', value: ch, position: i });
      i++;
      continue;
    }
    if (ch === '<' || ch === '>') {
      tokens.push({ type: 'comparison', value: ch, position: i });
      i++;
      continue;
    }
    if ('().[]'.includes(ch)) {
      tokens.push({ type: 'separator', value: ch, position: i });
      i++;
      continue;
    }
    if (ch === '!') {
      // Standalone `!` (not part of `!=` which was already handled)
      tokens.push({ type: 'comparison', value: ch, position: i });
      i++;
      continue;
    }

    // 8. Unrecognized character
    errors.push(
      createError(
        'EXPR_INVALID_TOKEN',
        `Unrecognized character "${ch}" at position ${i} in expression.`,
        path,
      ),
    );
    i++;
  }

  // --- Post-tokenization: check for forbidden tokens ---

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];

    // Forbidden JS operators: ===, !==, &&, ||
    if (
      (tok.value === '===' || tok.value === '!==') ||
      (tok.value === '&&' || tok.value === '||')
    ) {
      errors.push(
        createError(
          'EXPR_FORBIDDEN_TOKEN',
          `Forbidden operator "${tok.value}" at position ${tok.position}. Use "==" / "!=" or "and" / "or" instead.`,
          path,
        ),
      );
    }

    // Standalone `!` (not part of `!=`)
    if (tok.value === '!') {
      errors.push(
        createError(
          'EXPR_FORBIDDEN_TOKEN',
          `Forbidden operator "!" at position ${tok.position}. Use "not" instead.`,
          path,
        ),
      );
    }

    // Forbidden keywords
    if (tok.type === 'identifier' && FORBIDDEN_KEYWORD_SET.has(tok.value)) {
      errors.push(
        createError(
          'EXPR_FORBIDDEN_TOKEN',
          `Forbidden keyword "${tok.value}" at position ${tok.position}.`,
          path,
        ),
      );
    }

    // Bare identifiers without $ prefix
    if (tok.type === 'identifier' && !tok.value.startsWith('$') && !FORBIDDEN_KEYWORD_SET.has(tok.value)) {
      errors.push(
        createError(
          'EXPR_FORBIDDEN_TOKEN',
          `Identifier "${tok.value}" at position ${tok.position} must start with "$". Use "$${tok.value}" for variable references.`,
          path,
        ),
      );
    }

    // Function call pattern: identifier followed by `(`
    if (tok.type === 'identifier') {
      // Look ahead past any whitespace (already skipped during tokenization,
      // so the next token is the actual next non-whitespace token)
      const next = tokens[t + 1];
      if (next && next.type === 'separator' && next.value === '(') {
        errors.push(
          createError(
            'EXPR_FUNCTION_CALL',
            `Function call pattern detected: "${tok.value}(" at position ${tok.position}. Function calls are not allowed.`,
            path,
          ),
        );
      }
    }
  }

  return { tokens, errors };
}

/**
 * Determines whether a `-` character should be interpreted as a negative sign
 * (unary minus for a negative number literal) rather than a subtraction operator.
 *
 * A `-` is a negative sign when there is no preceding token, or the preceding
 * token is an operator, opening paren, or opening bracket.
 */
function isNegativeSign(tokens: Token[]): boolean {
  if (tokens.length === 0) return true;
  const prev = tokens[tokens.length - 1];
  if (
    prev.type === 'arithmetic' ||
    prev.type === 'comparison' ||
    prev.type === 'logic_keyword' ||
    prev.type === 'condition_keyword'
  ) {
    return true;
  }
  if (prev.type === 'separator' && (prev.value === '(' || prev.value === '[')) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Deep scan helper
// ---------------------------------------------------------------------------

/**
 * Recursively walks an object/array structure to find all $ref and $expr
 * values, calling the callback for each one found.
 */
function scanForDynamicValues(
  obj: unknown,
  basePath: string,
  callback: (value: unknown, path: string) => void,
): void {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return;
  }

  // Check if this object itself is a $ref or $expr
  if (isRef(obj) || isExpr(obj)) {
    callback(obj, basePath);
    return;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      scanForDynamicValues(obj[i], `${basePath}[${i}]`, callback);
    }
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      scanForDynamicValues(value, `${basePath}.${key}`, callback);
    }
  }
}

// ---------------------------------------------------------------------------
// $ref validation
// ---------------------------------------------------------------------------

function validateRef(refValue: string, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Length check
  if (refValue.length > 500) {
    errors.push(
      createError(
        'REF_TOO_LONG',
        `$ref value exceeds maximum length of 500 characters (got ${refValue.length}).`,
        path,
      ),
    );
  }

  // 2. Ref depth: split by `.` segments
  const segments = refValue.split('.');
  if (segments.length > EXPR_MAX_REF_DEPTH) {
    errors.push(
      createError(
        'EXPR_REF_DEPTH_EXCEEDED',
        `$ref path depth ${segments.length} exceeds maximum of ${EXPR_MAX_REF_DEPTH}.`,
        path,
      ),
    );
  }

  // 3. Array index check: find [N] patterns
  const arrayIndexPattern = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = arrayIndexPattern.exec(refValue)) !== null) {
    const index = parseInt(match[1], 10);
    if (index > EXPR_MAX_ARRAY_INDEX) {
      errors.push(
        createError(
          'EXPR_ARRAY_INDEX_EXCEEDED',
          `Array index ${index} in $ref exceeds maximum of ${EXPR_MAX_ARRAY_INDEX}.`,
          path,
        ),
      );
    }
  }

  // 4. Prototype pollution segments
  // Extract plain segment names (strip array index suffixes)
  for (const segment of segments) {
    const cleanSegment = segment.replace(/\[\d+\]/g, '');
    if (PROTOTYPE_POLLUTION_SEGMENTS.has(cleanSegment)) {
      errors.push(
        createError(
          'PROTOTYPE_POLLUTION',
          `$ref path contains forbidden segment "${cleanSegment}".`,
          path,
        ),
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// $expr validation
// ---------------------------------------------------------------------------

function validateExpr(exprValue: string, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Length check
  if (exprValue.length > EXPR_MAX_LENGTH) {
    errors.push(
      createError(
        'EXPR_TOO_LONG',
        `Expression exceeds maximum length of ${EXPR_MAX_LENGTH} characters (got ${exprValue.length}).`,
        path,
      ),
    );
  }

  // 2. Tokenize
  const { tokens, errors: tokenErrors } = tokenize(exprValue, path);
  errors.push(...tokenErrors);

  // 3. Token count
  if (tokens.length > EXPR_MAX_TOKENS) {
    errors.push(
      createError(
        'EXPR_TOO_MANY_TOKENS',
        `Expression has ${tokens.length} tokens, exceeding maximum of ${EXPR_MAX_TOKENS}.`,
        path,
      ),
    );
  }

  // 4. String literal lengths
  for (const tok of tokens) {
    if (tok.type === 'string' && tok.value.length > EXPR_MAX_STRING_LITERAL) {
      errors.push(
        createError(
          'EXPR_STRING_LITERAL_TOO_LONG',
          `String literal at position ${tok.position} has ${tok.value.length} characters, exceeding maximum of ${EXPR_MAX_STRING_LITERAL}.`,
          path,
        ),
      );
    }
  }

  // 5. Nesting depth (parentheses) and condition nesting (if keywords)
  let parenDepth = 0;
  let maxParenDepth = 0;
  let ifCount = 0;

  for (const tok of tokens) {
    if (tok.type === 'separator' && tok.value === '(') {
      parenDepth++;
      if (parenDepth > maxParenDepth) {
        maxParenDepth = parenDepth;
      }
    } else if (tok.type === 'separator' && tok.value === ')') {
      parenDepth--;
    } else if (tok.type === 'condition_keyword' && tok.value === 'if') {
      ifCount++;
    }
  }

  if (maxParenDepth > EXPR_MAX_NESTING) {
    errors.push(
      createError(
        'EXPR_NESTING_TOO_DEEP',
        `Expression parenthesis nesting depth ${maxParenDepth} exceeds maximum of ${EXPR_MAX_NESTING}.`,
        path,
      ),
    );
  }

  if (ifCount > EXPR_MAX_CONDITION_NESTING) {
    errors.push(
      createError(
        'EXPR_CONDITION_NESTING_TOO_DEEP',
        `Expression has ${ifCount} nested if-conditions, exceeding maximum of ${EXPR_MAX_CONDITION_NESTING}.`,
        path,
      ),
    );
  }

  // 6. Variable reference depth inside expr: $identifier followed by `.` segments
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.type === 'identifier' && tok.value.startsWith('$')) {
      // Count consecutive `.identifier` sequences
      let depth = 1; // The $identifier itself counts as depth 1
      let j = t + 1;
      while (j + 1 < tokens.length) {
        if (
          tokens[j].type === 'separator' &&
          tokens[j].value === '.' &&
          tokens[j + 1].type === 'identifier'
        ) {
          depth++;
          j += 2;
        } else {
          break;
        }
      }
      if (depth > EXPR_MAX_REF_DEPTH) {
        errors.push(
          createError(
            'EXPR_REF_DEPTH_EXCEEDED',
            `Variable reference "${tok.value}" has path depth ${depth}, exceeding maximum of ${EXPR_MAX_REF_DEPTH}.`,
            path,
          ),
        );
      }
    }
  }

  // 7. Array indices in tokens: `[` number `]` patterns
  for (let t = 0; t + 2 < tokens.length; t++) {
    if (
      tokens[t].type === 'separator' &&
      tokens[t].value === '[' &&
      tokens[t + 1].type === 'number' &&
      tokens[t + 2].type === 'separator' &&
      tokens[t + 2].value === ']'
    ) {
      const indexValue = parseFloat(tokens[t + 1].value);
      if (indexValue > EXPR_MAX_ARRAY_INDEX) {
        errors.push(
          createError(
            'EXPR_ARRAY_INDEX_EXCEEDED',
            `Array index ${indexValue} in expression exceeds maximum of ${EXPR_MAX_ARRAY_INDEX}.`,
            path,
          ),
        );
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Validates all $expr and $ref values found in the card's views.
 *
 * Uses tree traversal to visit every node, then deep-scans each node's
 * flattened node fields and `style` (and `condition`) for dynamic values.
 *
 * @param views - The `views` object from a UGCCard.
 * @returns An array of validation errors (empty if all constraints pass).
 */
export function validateExprConstraints(
  views: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  traverseCard(views, (node: TraversableNode, context: TraversalContext) => {
    // Scan node fields (excluding style/children/type/condition)
    const nodeFields = { ...node } as Record<string, unknown>;
    delete nodeFields.type;
    delete nodeFields.style;
    delete nodeFields.children;
    delete nodeFields.condition;
    scanForDynamicValues(nodeFields, context.path, (value, valuePath) => {
      if (isRef(value)) {
        errors.push(...validateRef(value.$ref, valuePath));
      } else if (isExpr(value)) {
        errors.push(...validateExpr(value.$expr, valuePath));
      }
    });

    // Scan style
    if (node.style) {
      scanForDynamicValues(node.style, `${context.path}.style`, (value, valuePath) => {
        if (isRef(value)) {
          errors.push(...validateRef(value.$ref, valuePath));
        } else if (isExpr(value)) {
          errors.push(...validateExpr(value.$expr, valuePath));
        }
      });
    }

    // Scan condition
    if (node.condition !== undefined) {
      scanForDynamicValues(node.condition, `${context.path}.condition`, (value, valuePath) => {
        if (isRef(value)) {
          errors.push(...validateRef(value.$ref, valuePath));
        } else if (isExpr(value)) {
          errors.push(...validateExpr(value.$expr, valuePath));
        }
      });
    }
  });

  return errors;
}
