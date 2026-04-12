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
  resolveRefPath,
} from '@safe-ugc-ui/types';
import {
  countResolvedStyleOutputBytes,
  utf8ByteLength,
} from '@safe-ugc-ui/types/internal/style-output';

import { type ValidationError, createError } from './result.js';
import { type TraversableNode, type TraversalContext, traverseCard } from './traverse.js';
import {
  type ResponsiveMode,
  RESPONSIVE_MODES,
  getEffectiveStyleForMode,
  mergeStyleWithCardStyles,
} from './responsive-utils.js';

function isTemplateObject(value: unknown): value is { $template: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$template' in value &&
    Array.isArray((value as Record<string, unknown>).$template)
  );
}

function stringifyTextScalar(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function countResolvedTemplatedStringBytes(
  value: unknown,
  state?: Record<string, unknown>,
): number {
  if (isTemplateObject(value)) {
    const resolved = value.$template
      .map((part) => {
        if (isRef(part)) {
          return stringifyTextScalar(state ? resolveRefPath(part.$ref, state) : undefined);
        }
        return stringifyTextScalar(part);
      })
      .join('');
    return utf8ByteLength(resolved);
  }

  if (isRef(value)) {
    return utf8ByteLength(
      stringifyTextScalar(state ? resolveRefPath(value.$ref, state) : undefined),
    );
  }

  return utf8ByteLength(stringifyTextScalar(value));
}

function countInteractiveLabelBytes(items: unknown, state?: Record<string, unknown>): number {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((total, item) => {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      return total;
    }

    const label = (item as Record<string, unknown>).label;
    return total + countResolvedTemplatedStringBytes(label, state);
  }, 0);
}

function countNodeTextBytes(
  node: Record<string, unknown>,
  state?: Record<string, unknown>,
): number {
  if (Array.isArray(node.spans)) {
    return node.spans.reduce((total, span) => {
      if (span == null || typeof span !== 'object' || Array.isArray(span)) {
        return total;
      }

      return (
        total + countResolvedTemplatedStringBytes((span as Record<string, unknown>).text, state)
      );
    }, 0);
  }

  switch (node.type) {
    case 'Text':
      return countResolvedTemplatedStringBytes(node.content, state);
    case 'Badge':
    case 'Chip':
    case 'Button':
      return countResolvedTemplatedStringBytes(node.label, state);
    case 'Accordion':
      return countInteractiveLabelBytes(node.items, state);
    case 'Tabs':
      return countInteractiveLabelBytes(node.tabs, state);
    default:
      return 0;
  }
}

function createResponsiveCountRecord(): Record<ResponsiveMode, number> {
  return {
    default: 0,
    medium: 0,
    compact: 0,
  };
}

function getEffectiveRenderableStyleForMode(
  node: TraversableNode,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  mode: ResponsiveMode,
): Record<string, unknown> | undefined {
  return getEffectiveStyleForMode(
    {
      ...node,
      style: mergeStyleWithCardStyles(node.style, cardStyles),
    },
    cardStyles,
    mode,
  );
}

function countNodeStyleBytesForMode(
  node: TraversableNode,
  state: Record<string, unknown> | undefined,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  mode: ResponsiveMode,
): number {
  const effectiveStyle = getEffectiveRenderableStyleForMode(node, cardStyles, mode);
  if (!effectiveStyle) {
    return 0;
  }

  const resolvedState = state ?? {};

  const hoverStyle =
    effectiveStyle.hoverStyle != null &&
    typeof effectiveStyle.hoverStyle === 'object' &&
    !Array.isArray(effectiveStyle.hoverStyle)
      ? (effectiveStyle.hoverStyle as Record<string, unknown>)
      : undefined;

  return (
    countResolvedStyleOutputBytes(effectiveStyle, resolvedState) +
    countResolvedStyleOutputBytes(hoverStyle, resolvedState)
  );
}

function countTextSpanStyleBytes(
  node: Record<string, unknown>,
  state?: Record<string, unknown>,
): number {
  if (!Array.isArray(node.spans)) {
    return 0;
  }

  return node.spans.reduce((total, span) => {
    if (span == null || typeof span !== 'object' || Array.isArray(span)) {
      return total;
    }

    const style = (span as Record<string, unknown>).style;
    if (style == null || typeof style !== 'object' || Array.isArray(style)) {
      return total;
    }

    return total + countResolvedStyleOutputBytes(style as Record<string, unknown>, state ?? {});
  }, 0);
}

// ---------------------------------------------------------------------------
// countTemplateMetrics — measure resource usage of a for-loop template
// ---------------------------------------------------------------------------

interface TemplateMetrics {
  nodes: number;
  textBytes: number;
  styleBytes: Record<ResponsiveMode, number>;
  overflowAutoCount: Record<ResponsiveMode, number>;
}

/**
 * Recursively count metrics for a for-loop template subtree.
 * Used to multiply metrics by (arrayLength - 1) since the traversal
 * already counts the template once.
 */
function countTemplateMetrics(
  template: unknown,
  state?: Record<string, unknown>,
  cardStyles?: Record<string, Record<string, unknown>>,
  fragments?: Record<string, unknown>,
): TemplateMetrics {
  const result: TemplateMetrics = {
    nodes: 0,
    textBytes: 0,
    styleBytes: createResponsiveCountRecord(),
    overflowAutoCount: createResponsiveCountRecord(),
  };

  traverseCard(
    { __template: template },
    (node: TraversableNode) => {
      if (node.type !== 'Switch') {
        result.nodes += 1;
      }

      result.textBytes += countNodeTextBytes(node as Record<string, unknown>, state);

      if (node.type === 'Text') {
        const spanStyleBytes = countTextSpanStyleBytes(node as Record<string, unknown>, state);
        for (const mode of RESPONSIVE_MODES) {
          result.styleBytes[mode] += spanStyleBytes;
        }
      }

      for (const mode of RESPONSIVE_MODES) {
        result.styleBytes[mode] += countNodeStyleBytesForMode(node, state, cardStyles, mode);
      }

      for (const mode of RESPONSIVE_MODES) {
        const effectiveStyle = getEffectiveStyleForMode(node, cardStyles, mode);
        if (effectiveStyle?.overflow === 'auto') {
          result.overflowAutoCount[mode]++;
        }
      }
    },
    undefined,
    fragments,
  );

  return result;
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
export function validateLimits(card: {
  state?: Record<string, unknown>;
  views: Record<string, unknown>;
  cardStyles?: Record<string, Record<string, unknown>>;
  fragments?: Record<string, unknown>;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  let nodeCount = 0;
  let textContentBytes = 0;
  const styleObjectsBytes = createResponsiveCountRecord();
  const overflowAutoCount = createResponsiveCountRecord();

  traverseCard(
    card.views,
    (node: TraversableNode, context: TraversalContext) => {
      // -----------------------------------------------------------------------
      // 1. Node count
      // -----------------------------------------------------------------------
      if (node.type !== 'Switch') {
        nodeCount++;
      }

      // -----------------------------------------------------------------------
      // 2. Text content total bytes
      // -----------------------------------------------------------------------
      textContentBytes += countNodeTextBytes(node as Record<string, unknown>, card.state);

      if (node.type === 'Text') {
        const spanStyleBytes = countTextSpanStyleBytes(node as Record<string, unknown>, card.state);
        for (const mode of RESPONSIVE_MODES) {
          styleObjectsBytes[mode] += spanStyleBytes;
        }
      }

      // -----------------------------------------------------------------------
      // 3. Style objects total bytes (use merged style if $style is present)
      // -----------------------------------------------------------------------
      {
        for (const mode of RESPONSIVE_MODES) {
          styleObjectsBytes[mode] += countNodeStyleBytesForMode(
            node,
            card.state,
            card.cardStyles,
            mode,
          );
        }
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
          if (card.state == null) {
            // No state — loop source may be provided at runtime, skip validation
          } else {
            const source = resolveRefPath(inValue, card.state);
            if (source === undefined) {
              // Single-segment path (e.g. "$items") at top-level (loopDepth 0)
              // must be a state key. If missing, likely a typo → report error.
              // Dotted paths or paths inside nested loops may reference
              // locals variables → skip.
              const pathAfterDollar = inValue.slice(1);
              if (!pathAfterDollar.includes('.') && context.loopDepth === 0) {
                errors.push(
                  createError(
                    'LOOP_SOURCE_MISSING',
                    `Loop source "${inValue}" not found in card state`,
                    `${context.path}.children`,
                  ),
                );
              }
            } else if (!Array.isArray(source)) {
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
            } else if (source.length > 1) {
              // Multiply template metrics by (N - 1) since traversal already
              // counts the template once
              const tplMetrics = countTemplateMetrics(
                forLoop.template,
                card.state,
                card.cardStyles,
                card.fragments,
              );
              const multiplier = source.length - 1;
              nodeCount += tplMetrics.nodes * multiplier;
              textContentBytes += tplMetrics.textBytes * multiplier;
              for (const mode of RESPONSIVE_MODES) {
                styleObjectsBytes[mode] += tplMetrics.styleBytes[mode] * multiplier;
                overflowAutoCount[mode] += tplMetrics.overflowAutoCount[mode] * multiplier;
              }
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
      // 6. overflow: auto count (use merged style if $style is present)
      // -----------------------------------------------------------------------
      for (const mode of RESPONSIVE_MODES) {
        const effectiveStyle = getEffectiveStyleForMode(node, card.cardStyles, mode);
        if (effectiveStyle?.overflow === 'auto') {
          overflowAutoCount[mode]++;
        }
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
    },
    undefined,
    card.fragments,
  );

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

  const maxStyleObjectsBytes = Math.max(
    styleObjectsBytes.default,
    styleObjectsBytes.medium,
    styleObjectsBytes.compact,
  );
  const worstStyleModes = RESPONSIVE_MODES.filter(
    (mode) => styleObjectsBytes[mode] === maxStyleObjectsBytes,
  );

  if (maxStyleObjectsBytes > STYLE_OBJECTS_TOTAL_MAX_BYTES) {
    errors.push(
      createError(
        'STYLE_SIZE_EXCEEDED',
        `Resolved style output is ${maxStyleObjectsBytes} bytes in ${worstStyleModes.join(
          ', ',
        )} mode, max is ${STYLE_OBJECTS_TOTAL_MAX_BYTES}`,
        'views',
      ),
    );
  }

  const maxOverflowAutoCount = Math.max(
    overflowAutoCount.default,
    overflowAutoCount.medium,
    overflowAutoCount.compact,
  );

  if (maxOverflowAutoCount > MAX_OVERFLOW_AUTO_COUNT) {
    errors.push(
      createError(
        'OVERFLOW_AUTO_COUNT_EXCEEDED',
        `Card has ${maxOverflowAutoCount} elements with overflow:auto in at least one responsive mode, max is ${MAX_OVERFLOW_AUTO_COUNT}`,
        'views',
      ),
    );
  }

  return errors;
}
