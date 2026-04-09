import {
  MAX_REF_PATH_SEGMENTS,
  PROTOTYPE_POLLUTION_SEGMENTS,
} from './constants.js';

export function parseRefPathSegments(refPath: string): string[] {
  const path = refPath.startsWith('$') ? refPath.slice(1) : refPath;
  const segments: string[] = [];

  for (const part of path.split('.')) {
    if (!part) {
      continue;
    }

    const bracketPattern = /\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    const firstBracket = part.indexOf('[');

    if (firstBracket > 0) {
      segments.push(part.slice(0, firstBracket));
    } else if (firstBracket === -1) {
      segments.push(part);
      continue;
    }

    while ((match = bracketPattern.exec(part)) !== null) {
      segments.push(match[1]);
    }
  }

  return segments;
}

export function hasForbiddenRefPathSegments(
  segments: readonly string[],
): boolean {
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
  return resolveRefPathSegments(parseRefPathSegments(refPath), root, maxDepth);
}
