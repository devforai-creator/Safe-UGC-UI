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
  PROTOTYPE_POLLUTION_SEGMENTS,
  isRef,
} from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { type TraversableNode, type TraversalContext, traverseCard } from './traverse.js';
import {
  type ResponsiveMode,
  RESPONSIVE_MODES,
  getEffectiveStyleForMode,
  getMergedCompactResponsiveStyle,
} from './responsive-utils.js';

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
// Helper: resolveRefFromState — resolve dotted $ref paths against state
// ---------------------------------------------------------------------------

/**
 * Resolve a $ref path against a state object. Supports dotted paths and
 * bracket notation (e.g. "$data.items[0].name").
 *
 * @returns The resolved value, or `undefined` if resolution fails.
 */
function resolveRefFromState(
  refPath: string,
  state: Record<string, unknown>,
): unknown {
  // Strip leading $
  const path = refPath.startsWith('$') ? refPath.slice(1) : refPath;
  const dotSegments = path.split('.');

  // Flatten dot-segments into individual traversal keys,
  // expanding bracket notation (e.g. "items[0][1]" -> ["items", "0", "1"])
  const keys: string[] = [];
  for (const dotSeg of dotSegments) {
    const bracketPattern = /\[(\d+)\]/g;
    const firstBracket = dotSeg.indexOf('[');
    const baseName = firstBracket === -1 ? dotSeg : dotSeg.slice(0, firstBracket);
    if (baseName) {
      keys.push(baseName);
    }
    let match: RegExpExecArray | null;
    while ((match = bracketPattern.exec(dotSeg)) !== null) {
      keys.push(match[1]);
    }
  }

  // Block prototype pollution
  for (const key of keys) {
    if (
      (PROTOTYPE_POLLUTION_SEGMENTS as readonly string[]).includes(key)
    ) {
      return undefined;
    }
  }

  // Traverse state
  let current: unknown = state;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;

    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) return undefined;
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }
  return current;
}

// ---------------------------------------------------------------------------
// countTemplateMetrics — measure resource usage of a for-loop template
// ---------------------------------------------------------------------------

interface TemplateMetrics {
  nodes: number;
  textBytes: number;
  styleBytes: number;
  overflowAutoCount: Record<ResponsiveMode, number>;
}

/**
 * Recursively count metrics for a for-loop template subtree.
 * Used to multiply metrics by (arrayLength - 1) since the traversal
 * already counts the template once.
 */
function countTemplateMetrics(
  template: unknown,
  cardStyles?: Record<string, Record<string, unknown>>,
): TemplateMetrics {
  const result: TemplateMetrics = {
    nodes: 0,
    textBytes: 0,
    styleBytes: 0,
    overflowAutoCount: {
      default: 0,
      compact: 0,
    },
  };
  if (template == null || typeof template !== 'object') return result;

  const node = template as Record<string, unknown>;
  if (!node.type) return result;

  result.nodes = 1;

  // Text bytes
  if (node.type === 'Text') {
    const content = (node as Record<string, unknown>).content;
      if (typeof content === 'string' && !isRef(content)) {
        result.textBytes = utf8ByteLength(content);
      }
  }

  // Style bytes (merged with $style)
  {
    const baseStyleForBytes = getEffectiveStyleForMode(
      node as TraversableNode,
      cardStyles,
      'default',
    );
    if (baseStyleForBytes) {
      result.styleBytes += utf8ByteLength(JSON.stringify(baseStyleForBytes));
    }

    const compactStyleForBytes = getMergedCompactResponsiveStyle(
      node as TraversableNode,
      cardStyles,
    );
    if (compactStyleForBytes) {
      result.styleBytes += utf8ByteLength(JSON.stringify(compactStyleForBytes));
    }

    for (const mode of RESPONSIVE_MODES) {
      const effectiveStyle = getEffectiveStyleForMode(
        node as TraversableNode,
        cardStyles,
        mode,
      );
      if (effectiveStyle?.overflow === 'auto') {
        result.overflowAutoCount[mode]++;
      }
    }
  }

  // Recurse into children
  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const childMetrics = countTemplateMetrics(child, cardStyles);
      result.nodes += childMetrics.nodes;
      result.textBytes += childMetrics.textBytes;
      result.styleBytes += childMetrics.styleBytes;
      for (const mode of RESPONSIVE_MODES) {
        result.overflowAutoCount[mode] += childMetrics.overflowAutoCount[mode];
      }
    }
  } else if (
    children != null &&
    typeof children === 'object' &&
    !Array.isArray(children) &&
    'template' in (children as Record<string, unknown>)
  ) {
    // Nested for-loop: count the template once (inner loop expansion
    // can't be calculated without knowing the inner array length)
    const innerTemplate = (children as Record<string, unknown>).template;
    const innerMetrics = countTemplateMetrics(innerTemplate, cardStyles);
    result.nodes += innerMetrics.nodes;
    result.textBytes += innerMetrics.textBytes;
    result.styleBytes += innerMetrics.styleBytes;
    for (const mode of RESPONSIVE_MODES) {
      result.overflowAutoCount[mode] += innerMetrics.overflowAutoCount[mode];
    }
  }

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
export function validateLimits(
  card: { state?: Record<string, unknown>; views: Record<string, unknown>; cardStyles?: Record<string, Record<string, unknown>> },
): ValidationError[] {
  const errors: ValidationError[] = [];

  let nodeCount = 0;
  let textContentBytes = 0;
  let styleObjectsBytes = 0;
  const overflowAutoCount: Record<ResponsiveMode, number> = {
    default: 0,
    compact: 0,
  };

  traverseCard(card.views, (node: TraversableNode, context: TraversalContext) => {
    // -----------------------------------------------------------------------
    // 1. Node count
    // -----------------------------------------------------------------------
    nodeCount++;

    // -----------------------------------------------------------------------
    // 2. Text content total bytes
    // -----------------------------------------------------------------------
    if (node.type === 'Text') {
      const content = (node as Record<string, unknown>).content;
      if (typeof content === 'string' && !isRef(content)) {
        textContentBytes += utf8ByteLength(content);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Style objects total bytes (use merged style if $style is present)
    // -----------------------------------------------------------------------
    {
      const baseStyleForBytes = getEffectiveStyleForMode(
        node,
        card.cardStyles,
        'default',
      );
      if (baseStyleForBytes) {
        styleObjectsBytes += utf8ByteLength(JSON.stringify(baseStyleForBytes));
      }

      const compactStyleForBytes = getMergedCompactResponsiveStyle(
        node,
        card.cardStyles,
      );
      if (compactStyleForBytes) {
        styleObjectsBytes += utf8ByteLength(JSON.stringify(compactStyleForBytes));
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
          const source = resolveRefFromState(inValue, card.state);
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
            const tplMetrics = countTemplateMetrics(forLoop.template, card.cardStyles);
            const multiplier = source.length - 1;
            nodeCount += tplMetrics.nodes * multiplier;
            textContentBytes += tplMetrics.textBytes * multiplier;
            styleObjectsBytes += tplMetrics.styleBytes * multiplier;
            for (const mode of RESPONSIVE_MODES) {
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

  const maxOverflowAutoCount = Math.max(
    overflowAutoCount.default,
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
