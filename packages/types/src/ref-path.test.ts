import { describe, expect, it } from 'vitest';

import {
  hasForbiddenRefPathSegments,
  parseRefPathSegments,
  resolveRefPath,
  resolveRefPathSegments,
} from './ref-path.js';
import { MAX_REF_PATH_SEGMENTS } from './constants.js';

describe('parseRefPathSegments', () => {
  it('parses dotted paths', () => {
    expect(parseRefPathSegments('$user.name')).toEqual(['user', 'name']);
  });

  it('parses bracket notation', () => {
    expect(parseRefPathSegments('$items[0].name')).toEqual(['items', '0', 'name']);
  });

  it('parses nested array indices', () => {
    expect(parseRefPathSegments('$data[1][0]')).toEqual(['data', '1', '0']);
  });

  it('accepts paths without a leading dollar sign', () => {
    expect(parseRefPathSegments('items[0]')).toEqual(['items', '0']);
  });
});

describe('hasForbiddenRefPathSegments', () => {
  it('detects prototype pollution segments', () => {
    expect(hasForbiddenRefPathSegments(['safe', '__proto__'])).toBe(true);
  });

  it('returns false for safe segments', () => {
    expect(hasForbiddenRefPathSegments(['safe', 'path', '0'])).toBe(false);
  });
});

describe('resolveRefPath', () => {
  it('resolves nested data from objects and arrays', () => {
    const state = {
      users: [
        { posts: [{ title: 'Hello' }, { title: 'World' }] },
      ],
    };

    expect(resolveRefPath('$users[0].posts[1].title', state)).toBe('World');
  });

  it('returns undefined for prototype pollution segments', () => {
    expect(resolveRefPath('$safe.__proto__.bad', { safe: {} })).toBeUndefined();
  });

  it('returns undefined when the path exceeds the default depth limit', () => {
    const state = {
      a: {
        b: {
          c: {
            d: {
              e: {
                f: 'too-deep',
              },
            },
          },
        },
      },
    };

    expect(MAX_REF_PATH_SEGMENTS).toBe(5);
    expect(resolveRefPath('$a.b.c.d.e.f', state)).toBeUndefined();
  });

  it('allows a custom depth limit when requested', () => {
    const state = {
      a: {
        b: {
          c: {
            d: {
              e: {
                f: 'allowed',
              },
            },
          },
        },
      },
    };

    expect(resolveRefPath('$a.b.c.d.e.f', state, 6)).toBe('allowed');
  });
});

describe('resolveRefPathSegments', () => {
  it('returns the root object for an empty segment list', () => {
    const state = { ok: true };
    expect(resolveRefPathSegments([], state)).toBe(state);
  });
});
