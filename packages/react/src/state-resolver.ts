/**
 * @safe-ugc-ui/react — State Resolver
 *
 * Resolves $ref values from card state.
 *
 * - $ref: looks up a dotted path in the state object
 * - Literal values pass through unchanged
 */

import { parseValidRefPathSegments, resolveRefPathSegments } from '@safe-ugc-ui/types';

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
  const segments = parseValidRefPathSegments(refPath);
  if (!segments) {
    return undefined;
  }

  // Choose starting object: locals first, then state
  const firstSeg = segments[0];
  const root = locals && firstSeg && firstSeg in locals ? locals : state;

  return resolveRefPathSegments(segments, root);
}

/**
 * Resolve a value that might be a literal or $ref.
 * - Literal: return as-is
 * - $ref: resolve from state
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
  }
  return value;
}

function stringifyTextScalar(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function isTemplateObject(value: unknown): value is { $template: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$template' in value &&
    Array.isArray((value as Record<string, unknown>).$template)
  );
}

export function resolveTemplate(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string | undefined {
  if (!isTemplateObject(value)) {
    return undefined;
  }

  return value.$template
    .map((part) => stringifyTextScalar(resolveValue(part, state, locals)))
    .join('');
}

export function resolveTextValue(
  value: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string {
  const template = resolveTemplate(value, state, locals);
  if (template !== undefined) {
    return template;
  }

  return stringifyTextScalar(resolveValue(value, state, locals));
}
