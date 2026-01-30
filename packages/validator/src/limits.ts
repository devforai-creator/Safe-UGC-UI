/**
 * @safe-ugc-ui/validator — Resource Limits Validation
 *
 * Validates resource limits per spec section 6.
 *
 * Uses a single traversal pass to collect all metrics (node count,
 * text content size, style object size, loop iterations, nested loops,
 * overflow:auto count, and stack nesting), then checks each against the
 * defined constants from @safe-ugc-ui/types.
 */

import {
  TEXT_CONTENT_TOTAL_MAX_BYTES,
  STYLE_OBJECTS_TOTAL_MAX_BYTES,
  MAX_NODE_COUNT,
  MAX_LOOP_ITERATIONS,
  MAX_NESTED_LOOPS,
  MAX_OVERFLOW_AUTO_COUNT,
  MAX_STACK_NESTING,
  isRef,
  isExpr,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { type TraversableNode, type TraversalContext, traverseCard } from './traverse.js';

// ---------------------------------------------------------------------------
// UTF-8 byte length — platform-agnostic (no DOM/Node dependency)
// ---------------------------------------------------------------------------

/**
 * Calculate UTF-8 byte length of a string without depending on
 * TextEncoder (DOM) or Buffer (Node).
 */
function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair → 4 UTF-8 bytes
      bytes += 4;
      i++; // skip low surrogate
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// validateLimits
// ---------------------------------------------------------------------------

/**
 * Validate all resource limits defined in spec section 6.
 *
 * Performs a single traversal of the card tree, collecting metrics for:
 *   - Total node count
 *   - Total text content bytes (UTF-8)
 *   - Total style object bytes (UTF-8, JSON-serialized)
 *   - Loop iteration counts
 *   - Nested loop depth
 *   - overflow:auto element count
 *   - Stack nesting depth
 *
 * @param card - A card object with optional `state` and required `views`.
 * @returns An array of validation errors (empty if all limits are satisfied).
 */
export function validateLimits(
  card: { state?: Record<string, unknown>; views: Record<string, unknown> },
): ValidationError[] {
  const errors: ValidationError[] = [];

  let nodeCount = 0;
  let textContentBytes = 0;
  let styleObjectsBytes = 0;
  let overflowAutoCount = 0;

  traverseCard(card.views, (node: TraversableNode, context: TraversalContext) => {
    // -----------------------------------------------------------------------
    // 1. Node count
    // -----------------------------------------------------------------------
    nodeCount++;

    // -----------------------------------------------------------------------
    // 2. Text content total bytes
    // -----------------------------------------------------------------------
    if (node.type === 'Text' && node.props != null) {
      const content = (node.props as Record<string, unknown>).content;
      if (typeof content === 'string' && !isRef(content) && !isExpr(content)) {
        textContentBytes += utf8ByteLength(content);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Style objects total bytes
    // -----------------------------------------------------------------------
    if (node.style != null && typeof node.style === 'object') {
      const serialized = JSON.stringify(node.style);
      styleObjectsBytes += utf8ByteLength(serialized);
    }

    // -----------------------------------------------------------------------
    // 4. Loop iterations
    // -----------------------------------------------------------------------
    const children = node.children;
    if (
      children != null &&
      typeof children === 'object' &&
      !Array.isArray(children) &&
      'for' in children &&
      'in' in children &&
      'template' in children
    ) {
      const forLoop = children as { for: string; in: string; template: unknown };
      const inValue = forLoop.in;

      if (typeof inValue === 'string' && inValue.startsWith('$')) {
        const stateKey = inValue.slice(1);

        if (card.state == null || !(stateKey in card.state)) {
          errors.push(
            createError(
              'LOOP_SOURCE_MISSING',
              `Loop source "${inValue}" not found in card state`,
              `${context.path}.children`,
            ),
          );
        } else {
          const source = card.state[stateKey];
          if (!Array.isArray(source)) {
            errors.push(
              createError(
                'LOOP_SOURCE_NOT_ARRAY',
                `Loop source "${inValue}" is not an array`,
                `${context.path}.children`,
              ),
            );
          } else if (source.length > MAX_LOOP_ITERATIONS) {
            errors.push(
              createError(
                'LOOP_ITERATIONS_EXCEEDED',
                `Loop source "${inValue}" has ${source.length} items, max is ${MAX_LOOP_ITERATIONS}`,
                `${context.path}.children`,
              ),
            );
          }
        }
      }

      // -------------------------------------------------------------------
      // 5. Nested loops
      // -------------------------------------------------------------------
      if (context.loopDepth >= MAX_NESTED_LOOPS) {
        errors.push(
          createError(
            'NESTED_LOOPS_EXCEEDED',
            `Loop nesting depth ${context.loopDepth + 1} exceeds maximum of ${MAX_NESTED_LOOPS}`,
            `${context.path}.children`,
          ),
        );
      }
    }

    // -----------------------------------------------------------------------
    // 6. overflow: auto count
    // -----------------------------------------------------------------------
    if (node.style?.overflow === 'auto') {
      overflowAutoCount++;
    }

    // -----------------------------------------------------------------------
    // 7. Stack nesting
    // -----------------------------------------------------------------------
    if (node.type === 'Stack' && context.stackDepth >= MAX_STACK_NESTING) {
      errors.push(
        createError(
          'STACK_NESTING_EXCEEDED',
          `Stack nesting depth ${context.stackDepth + 1} exceeds maximum of ${MAX_STACK_NESTING}`,
          context.path,
        ),
      );
    }
  });

  // -------------------------------------------------------------------------
  // Post-traversal aggregate checks
  // -------------------------------------------------------------------------

  if (nodeCount > MAX_NODE_COUNT) {
    errors.push(
      createError(
        'NODE_COUNT_EXCEEDED',
        `Card has ${nodeCount} nodes, max is ${MAX_NODE_COUNT}`,
        'views',
      ),
    );
  }

  if (textContentBytes > TEXT_CONTENT_TOTAL_MAX_BYTES) {
    errors.push(
      createError(
        'TEXT_CONTENT_SIZE_EXCEEDED',
        `Total text content is ${textContentBytes} bytes, max is ${TEXT_CONTENT_TOTAL_MAX_BYTES}`,
        'views',
      ),
    );
  }

  if (styleObjectsBytes > STYLE_OBJECTS_TOTAL_MAX_BYTES) {
    errors.push(
      createError(
        'STYLE_SIZE_EXCEEDED',
        `Total style objects size is ${styleObjectsBytes} bytes, max is ${STYLE_OBJECTS_TOTAL_MAX_BYTES}`,
        'views',
      ),
    );
  }

  if (overflowAutoCount > MAX_OVERFLOW_AUTO_COUNT) {
    errors.push(
      createError(
        'OVERFLOW_AUTO_COUNT_EXCEEDED',
        `Card has ${overflowAutoCount} elements with overflow:auto, max is ${MAX_OVERFLOW_AUTO_COUNT}`,
        'views',
      ),
    );
  }

  return errors;
}
