import {
  MAX_REF_ARRAY_INDEX,
  MAX_REF_PATH_SEGMENTS,
  PROTOTYPE_POLLUTION_SEGMENTS,
} from './constants.js';

function parseValidRefPathSegmentsInternal(
  refPath: string,
  maxDepth: number = Number.POSITIVE_INFINITY,
): string[] | null {
  if (!refPath.startsWith('$')) {
    return null;
  }

  const path = refPath.slice(1);
  if (path.length === 0) {
    return null;
  }

  const segments: string[] = [];
  let index = 0;

  while (index < path.length) {
    if (path[index] === '.') {
      return null;
    }

    const propertyStart = index;
    while (
      index < path.length &&
      path[index] !== '.' &&
      path[index] !== '[' &&
      path[index] !== ']'
    ) {
      index++;
    }

    if (index === propertyStart) {
      return null;
    }

    segments.push(path.slice(propertyStart, index));

    while (path[index] === '[') {
      index++;
      const digitStart = index;

      while (index < path.length && /[0-9]/.test(path[index] ?? '')) {
        index++;
      }

      if (index === digitStart || path[index] !== ']') {
        return null;
      }

      const rawArrayIndex = path.slice(digitStart, index);
      const arrayIndex = Number(rawArrayIndex);
      if (!Number.isSafeInteger(arrayIndex) || arrayIndex > MAX_REF_ARRAY_INDEX) {
        return null;
      }

      segments.push(rawArrayIndex);
      index++;
    }

    if (index === path.length) {
      break;
    }

    if (path[index] !== '.') {
      return null;
    }

    index++;
    if (index === path.length) {
      return null;
    }
  }

  if (segments.length === 0 || segments.length > maxDepth) {
    return null;
  }

  return segments;
}

export function parseValidRefPathSegments(
  refPath: string,
  maxDepth: number = MAX_REF_PATH_SEGMENTS,
): string[] | null {
  return parseValidRefPathSegmentsInternal(refPath, maxDepth);
}

export function isValidRefPathSyntax(
  refPath: string,
  maxDepth: number = MAX_REF_PATH_SEGMENTS,
): boolean {
  return parseValidRefPathSegments(refPath, maxDepth) !== null;
}

export function parseRefPathSegments(refPath: string): string[] {
  return parseValidRefPathSegmentsInternal(refPath) ?? [];
}

export function hasForbiddenRefPathSegments(segments: readonly string[]): boolean {
  return segments.some((segment) =>
    (PROTOTYPE_POLLUTION_SEGMENTS as readonly string[]).includes(segment),
  );
}

export function resolveRefPathSegments(
  segments: readonly string[],
  root: Record<string, unknown>,
  maxDepth: number = MAX_REF_PATH_SEGMENTS,
): unknown {
  if (hasForbiddenRefPathSegments(segments)) {
    return undefined;
  }

  if (segments.length > maxDepth) {
    return undefined;
  }

  let current: unknown = root;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function resolveRefPath(
  refPath: string,
  root: Record<string, unknown>,
  maxDepth: number = MAX_REF_PATH_SEGMENTS,
): unknown {
  const segments = parseValidRefPathSegments(refPath, maxDepth);
  if (!segments) {
    return undefined;
  }

  return resolveRefPathSegments(segments, root, maxDepth);
}
