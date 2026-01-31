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
 * Parse a $ref path into individual segments.
 * Handles both dot notation and bracket notation:
 *   "items[0].name" → ["items", "0", "name"]
 *   "data[2][3]" → ["data", "2", "3"]
 *   "simple.path" → ["simple", "path"]
 */
function parseRefSegments(path: string): string[] {
  const segments: string[] = [];
  const dotParts = path.split('.');
  for (const part of dotParts) {
    if (!part) continue;
    // Check for bracket notation: extract base and indices
    const bracketPattern = /\[(\d+)\]/g;
    let match: RegExpExecArray | null;

    // Find the base name (before first bracket)
    const firstBracket = part.indexOf('[');
    if (firstBracket > 0) {
      segments.push(part.slice(0, firstBracket));
    } else if (firstBracket === -1) {
      // No brackets at all
      segments.push(part);
      continue;
    }

    // Extract all bracket indices
    while ((match = bracketPattern.exec(part)) !== null) {
      segments.push(match[1]);
    }

    // If part starts with [ and no base was added
    if (firstBracket === 0) {
      // Edge case: segment is just [0] with no base name
      // This shouldn't normally happen but handle gracefully
    }
  }
  return segments;
}

/**
 * Resolves a $ref path (e.g. "$hp", "$items[0].name") from card state.
 *
 * - Strips leading '$' from the path
 * - Parses dot notation and bracket notation into segments
 * - Blocks __proto__, constructor, prototype segments
 * - Max depth of 5 segments per spec
 * - Returns undefined if path doesn't exist
 */
export function resolveRef(
  refPath: string,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): unknown {
  const path = refPath.startsWith('$') ? refPath.slice(1) : refPath;
  const segments = parseRefSegments(path);

  // Block prototype pollution
  for (const seg of segments) {
    if ((PROTOTYPE_POLLUTION_SEGMENTS as readonly string[]).includes(seg)) {
      return undefined;
    }
  }

  // Max depth check
  if (segments.length > 5) return undefined;

  // Choose starting object: locals first, then state
  const firstSeg = segments[0];
  let current: unknown;
  if (locals && firstSeg && firstSeg in locals) {
    current = locals;
  } else {
    current = state;
  }

  // Traverse
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      if (isNaN(idx)) return undefined;
      current = current[idx];
    } else {
      current = (current as Record<string, unknown>)[seg];
    }
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
  locals?: Record<string, unknown>,
): unknown {
  if (value == null) return value;
  if (typeof value === 'object' && value !== null) {
    if ('$ref' in value && typeof (value as Record<string, unknown>).$ref === 'string') {
      return resolveRef((value as Record<string, unknown>).$ref as string, state, locals);
    }
    if ('$expr' in value) {
      // Phase 2: expression evaluation
      return undefined;
    }
  }
  return value;
}
