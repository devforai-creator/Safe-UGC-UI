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
  getMergedResponsiveStyleOverride,
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

function isTemplateObject(
  value: unknown,
): value is { $template: unknown[] } {
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
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
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
          return stringifyTextScalar(
            state ? resolveRefFromState(part.$ref, state) : undefined,
          );
        }
        return stringifyTextScalar(part);
      })
      .join('');
    return utf8ByteLength(resolved);
  }

  if (isRef(value)) {
    return utf8ByteLength(
      stringifyTextScalar(
        state ? resolveRefFromState(value.$ref, state) : undefined,
      ),
    );
  }

  return utf8ByteLength(stringifyTextScalar(value));
}

function countInteractiveLabelBytes(
  items: unknown,
  state?: Record<string, unknown>,
): number {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((total, item) => {
    if (
      item == null ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
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
      if (
        span == null ||
        typeof span !== 'object' ||
        Array.isArray(span)
      ) {
        return total;
      }

      return total + countResolvedTemplatedStringBytes(
        (span as Record<string, unknown>).text,
        state,
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

function resolveSerializableStyleValue(
  value: unknown,
  state?: Record<string, unknown>,
): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (isRef(value)) {
    if (!state) {
      return undefined;
    }

    const resolved = resolveRefFromState(value.$ref, state);
    if (
      resolved === null ||
      typeof resolved === 'string' ||
      typeof resolved === 'number' ||
      typeof resolved === 'boolean'
    ) {
      return resolved;
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    const resolvedItems = value
      .map((item) => resolveSerializableStyleValue(item, state))
      .filter((item) => item !== undefined);
    return resolvedItems.length > 0 ? resolvedItems : undefined;
  }

  if (typeof value === 'object' && value !== null) {
    const resolvedEntries = Object.entries(value as Record<string, unknown>)
      .reduce<Record<string, unknown>>((acc, [key, child]) => {
        const resolvedChild = resolveSerializableStyleValue(child, state);
        if (resolvedChild !== undefined) {
          acc[key] = resolvedChild;
        }
        return acc;
      }, {});

    return Object.keys(resolvedEntries).length > 0
      ? resolvedEntries
      : undefined;
  }

  return value;
}

function countResolvedStyleBytes(
  style: Record<string, unknown> | undefined,
  state?: Record<string, unknown>,
): number {
  const resolvedStyle = resolveSerializableStyleValue(style, state);
  if (
    resolvedStyle == null ||
    typeof resolvedStyle !== 'object' ||
    Array.isArray(resolvedStyle)
  ) {
    return 0;
  }

  const serialized = JSON.stringify(resolvedStyle);
  if (!serialized || serialized === '{}') {
    return 0;
  }

  return utf8ByteLength(serialized);
}

function countTextSpanStyleBytes(
  node: Record<string, unknown>,
  state?: Record<string, unknown>,
): number {
  if (!Array.isArray(node.spans)) {
    return 0;
  }

  return node.spans.reduce((total, span) => {
    if (
      span == null ||
      typeof span !== 'object' ||
      Array.isArray(span)
    ) {
      return total;
    }

    const style = (span as Record<string, unknown>).style;
    if (
      style == null ||
      typeof style !== 'object' ||
      Array.isArray(style)
    ) {
      return total;
    }

    return total + countResolvedStyleBytes(
      style as Record<string, unknown>,
      state,
    );
  }, 0);
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
  state?: Record<string, unknown>,
  cardStyles?: Record<string, Record<string, unknown>>,
  fragments?: Record<string, unknown>,
): TemplateMetrics {
  const result: TemplateMetrics = {
    nodes: 0,
    textBytes: 0,
    styleBytes: 0,
    overflowAutoCount: {
      default: 0,
      medium: 0,
      compact: 0,
    },
  };

  traverseCard(
    { __template: template },
    (node: TraversableNode) => {
      if (node.type !== 'Switch') {
        result.nodes += 1;
      }

      result.textBytes += countNodeTextBytes(
        node as Record<string, unknown>,
        state,
      );

      if (node.type === 'Text') {
        result.styleBytes += countTextSpanStyleBytes(
          node as Record<string, unknown>,
          state,
        );
      }

      const baseStyleForBytes = getEffectiveStyleForMode(
        node,
        cardStyles,
        'default',
      );
      if (baseStyleForBytes) {
        result.styleBytes += countResolvedStyleBytes(
          baseStyleForBytes,
          state,
        );
      }

      for (const mode of ['medium', 'compact'] as const) {
        const responsiveStyleForBytes = getMergedResponsiveStyleOverride(
          node,
          cardStyles,
          mode,
        );
        if (responsiveStyleForBytes) {
          result.styleBytes += countResolvedStyleBytes(
            responsiveStyleForBytes,
            state,
          );
        }
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
export function validateLimits(
  card: {
    state?: Record<string, unknown>;
    views: Record<string, unknown>;
    cardStyles?: Record<string, Record<string, unknown>>;
    fragments?: Record<string, unknown>;
  },
): ValidationError[] {
  const errors: ValidationError[] = [];

  let nodeCount = 0;
  let textContentBytes = 0;
  let styleObjectsBytes = 0;
  const overflowAutoCount: Record<ResponsiveMode, number> = {
    default: 0,
    medium: 0,
    compact: 0,
  };

  traverseCard(card.views, (node: TraversableNode, context: TraversalContext) => {
    // -----------------------------------------------------------------------
    // 1. Node count
    // -----------------------------------------------------------------------
    if (node.type !== 'Switch') {
      nodeCount++;
    }

    // -----------------------------------------------------------------------
    // 2. Text content total bytes
    // -----------------------------------------------------------------------
    textContentBytes += countNodeTextBytes(
      node as Record<string, unknown>,
      card.state,
    );

    if (node.type === 'Text') {
      styleObjectsBytes += countTextSpanStyleBytes(
        node as Record<string, unknown>,
        card.state,
      );
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
        styleObjectsBytes += countResolvedStyleBytes(
          baseStyleForBytes,
          card.state,
        );
      }

      for (const mode of ['medium', 'compact'] as const) {
        const responsiveStyleForBytes = getMergedResponsiveStyleOverride(
          node,
          card.cardStyles,
          mode,
        );
        if (responsiveStyleForBytes) {
          styleObjectsBytes += countResolvedStyleBytes(
            responsiveStyleForBytes,
            card.state,
          );
        }
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
            const tplMetrics = countTemplateMetrics(
              forLoop.template,
              card.state,
              card.cardStyles,
              card.fragments,
            );
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
  }, undefined, card.fragments);

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
