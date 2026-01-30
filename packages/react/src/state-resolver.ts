/**
 * @safe-ugc-ui/react — State Resolver
 *
 * Resolves $ref and $expr values from card state.
 *
 * - $ref: looks up a dotted path in the state object
 * - $expr: returns undefined (Phase 2 — expression evaluation not yet implemented)
 * - Literal values pass through unchanged
 */

import { PROTOTYPE_POLLUTION_SEGMENTS } from '@safe-ugc-ui/types';

/**
 * Resolves a $ref path (e.g. "$hp", "$msg.sender") from card state.
 *
 * - Strips leading '$' from the path
 * - Splits by '.' for nested access (max 5 levels per spec)
 * - Blocks __proto__, constructor, prototype segments
 * - Returns undefined if path doesn't exist
 */
export function resolveRef(
  refPath: string,
  state: Record<string, unknown>,
): unknown {
  // Strip leading $
  const path = refPath.startsWith('$') ? refPath.slice(1) : refPath;
  const segments = path.split('.');

  // Block prototype pollution
  for (const seg of segments) {
    if ((PROTOTYPE_POLLUTION_SEGMENTS as readonly string[]).includes(seg)) {
      return undefined;
    }
  }

  // Traverse state
  let current: unknown = state;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Resolve a value that might be a literal, $ref, or $expr.
 * - Literal: return as-is
 * - $ref: resolve from state
 * - $expr: return undefined (Phase 2)
 */
export function resolveValue(
  value: unknown,
  state: Record<string, unknown>,
): unknown {
  if (value == null) return value;
  if (typeof value === 'object' && value !== null) {
    if ('$ref' in value && typeof (value as Record<string, unknown>).$ref === 'string') {
      return resolveRef((value as Record<string, unknown>).$ref as string, state);
    }
    if ('$expr' in value) {
      // Phase 2: expression evaluation
      return undefined;
    }
  }
  return value;
}
