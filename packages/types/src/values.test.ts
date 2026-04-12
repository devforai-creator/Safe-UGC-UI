import { describe, it, expect } from 'vitest';
import { isRef, isDynamic, isAssetPath, refSchema, assetPathSchema } from './values.js';
import { textSpanStyleSchema } from './styles.js';
import {
  CARD_JSON_MAX_BYTES,
  MAX_NODE_COUNT,
  MAX_INTERACTIVE_ITEMS,
  MAX_LOOP_ITERATIONS,
  ZINDEX_MIN,
  ZINDEX_MAX,
  ALL_COMPONENT_TYPES,
  ALLOWED_BORDER_STYLE_VALUES,
  ALLOWED_DISPLAY_VALUES,
  ALLOWED_TRANSITION_EASINGS,
  ALLOWED_FONT_FAMILIES,
  ALLOWED_OBJECT_FIT_VALUES,
  ALLOWED_POSITION_VALUES,
  ALLOWED_OVERFLOW_VALUES,
  ALLOWED_TRANSITION_PROPERTIES,
  COLOR_STYLE_PROPERTIES,
  LENGTH_AUTO_STYLE_PROPERTIES,
  LENGTH_STYLE_PROPERTIES,
  RANGE_LIMITED_LENGTH_STYLE_PROPERTIES,
  DIRECT_RENDERABLE_STYLE_PROPERTIES,
  FORBIDDEN_STYLE_PROPERTIES,
  RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
  TEXT_SPAN_STYLE_PROPERTIES,
} from './constants.js';

// ===========================================================================
// 1. Type guard functions
// ===========================================================================

describe('isRef', () => {
  it('returns true for a valid Ref object', () => {
    expect(isRef({ $ref: 'foo' })).toBe(true);
  });

  it('returns true for a Ref with an empty string', () => {
    expect(isRef({ $ref: '' })).toBe(true);
  });

  it('returns true for a Ref with extra properties', () => {
    expect(isRef({ $ref: 'bar', extra: 42 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRef(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRef(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isRef('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isRef(42)).toBe(false);
  });

  it('returns false for a boolean', () => {
    expect(isRef(true)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isRef({})).toBe(false);
  });

  it('returns false for an object without $ref', () => {
    expect(isRef({ name: 'test' })).toBe(false);
  });

  it('returns false when $ref is not a string (number)', () => {
    expect(isRef({ $ref: 123 })).toBe(false);
  });

  it('returns false when $ref is not a string (null)', () => {
    expect(isRef({ $ref: null })).toBe(false);
  });

  it('returns false when $ref is not a string (boolean)', () => {
    expect(isRef({ $ref: true })).toBe(false);
  });

  it('returns false when $ref is not a string (object)', () => {
    expect(isRef({ $ref: {} })).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isRef([1, 2, 3])).toBe(false);
  });
});

describe('isDynamic', () => {
  it('returns true for a Ref', () => {
    expect(isDynamic({ $ref: 'state.count' })).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isDynamic({ key: 'value' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDynamic(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDynamic(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isDynamic('static text')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isDynamic(42)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isDynamic({})).toBe(false);
  });

  it('returns false when $ref is not a string', () => {
    expect(isDynamic({ $ref: 123 })).toBe(false);
  });

  it('returns true for an object with both $ref and extra keys (matches $ref)', () => {
    expect(isDynamic({ $ref: 'x', extra: 'y' })).toBe(true);
  });
});

describe('isAssetPath', () => {
  it('returns true for a valid asset path', () => {
    expect(isAssetPath('@assets/img.png')).toBe(true);
  });

  it('returns true for a nested asset path', () => {
    expect(isAssetPath('@assets/icons/arrow.svg')).toBe(true);
  });

  it('returns true for @assets/ with nothing after the slash', () => {
    expect(isAssetPath('@assets/')).toBe(true);
  });

  it('returns false for a plain filename', () => {
    expect(isAssetPath('foo.png')).toBe(false);
  });

  it('returns false for a string that does not start with @assets/', () => {
    expect(isAssetPath('assets/img.png')).toBe(false);
  });

  it('returns false for a string that starts with @asset/ (missing s)', () => {
    expect(isAssetPath('@asset/img.png')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isAssetPath('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAssetPath(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAssetPath(undefined)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isAssetPath(42)).toBe(false);
  });

  it('returns false for an object', () => {
    expect(isAssetPath({ path: '@assets/img.png' })).toBe(false);
  });

  it('returns false for @assets without trailing slash', () => {
    expect(isAssetPath('@assets')).toBe(false);
  });
});

// ===========================================================================
// 2. Zod schemas
// ===========================================================================

describe('refSchema', () => {
  it('accepts a valid Ref object', () => {
    const result = refSchema.safeParse({ $ref: 'foo' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ $ref: 'foo' });
    }
  });

  it('accepts a Ref with an empty string value', () => {
    const result = refSchema.safeParse({ $ref: '' });
    expect(result.success).toBe(true);
  });

  it('rejects when $ref is a number', () => {
    const result = refSchema.safeParse({ $ref: 123 });
    expect(result.success).toBe(false);
  });

  it('rejects an empty object (missing $ref)', () => {
    const result = refSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects when $ref is null', () => {
    const result = refSchema.safeParse({ $ref: null });
    expect(result.success).toBe(false);
  });

  it('rejects a plain string', () => {
    const result = refSchema.safeParse('foo');
    expect(result.success).toBe(false);
  });

  it('strips extra keys (zod default behavior)', () => {
    const result = refSchema.safeParse({ $ref: 'x', extra: 'y' });
    expect(result.success).toBe(true);
    if (result.success) {
      // Zod strips unknown keys by default in z.object
      expect(result.data).toEqual({ $ref: 'x' });
    }
  });
});

describe('assetPathSchema', () => {
  it('accepts a valid asset path', () => {
    const result = assetPathSchema.safeParse('@assets/img.png');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('@assets/img.png');
    }
  });

  it('accepts a nested asset path', () => {
    const result = assetPathSchema.safeParse('@assets/icons/check.svg');
    expect(result.success).toBe(true);
  });

  it('accepts @assets/ with nothing after the slash', () => {
    const result = assetPathSchema.safeParse('@assets/');
    expect(result.success).toBe(true);
  });

  it('rejects a string that does not start with @assets/', () => {
    const result = assetPathSchema.safeParse('foo.png');
    expect(result.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = assetPathSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects a string starting with @asset/ (missing s)', () => {
    const result = assetPathSchema.safeParse('@asset/img.png');
    expect(result.success).toBe(false);
  });

  it('rejects a number', () => {
    const result = assetPathSchema.safeParse(123);
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = assetPathSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects @assets without trailing slash', () => {
    const result = assetPathSchema.safeParse('@assets');
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// 3. Constants
// ===========================================================================

describe('constants', () => {
  it('CARD_JSON_MAX_BYTES equals 1,000,000', () => {
    expect(CARD_JSON_MAX_BYTES).toBe(1_000_000);
  });

  it('MAX_NODE_COUNT equals 10,000', () => {
    expect(MAX_NODE_COUNT).toBe(10_000);
  });

  it('MAX_LOOP_ITERATIONS equals 1,000', () => {
    expect(MAX_LOOP_ITERATIONS).toBe(1_000);
  });

  it('MAX_INTERACTIVE_ITEMS equals 16', () => {
    expect(MAX_INTERACTIVE_ITEMS).toBe(16);
  });

  it('ZINDEX_MIN equals 0', () => {
    expect(ZINDEX_MIN).toBe(0);
  });

  it('ZINDEX_MAX equals 100', () => {
    expect(ZINDEX_MAX).toBe(100);
  });

  it('ALL_COMPONENT_TYPES contains exactly 19 entries', () => {
    expect(ALL_COMPONENT_TYPES).toHaveLength(19);
  });

  it('ALL_COMPONENT_TYPES includes all expected layout components', () => {
    expect(ALL_COMPONENT_TYPES).toContain('Box');
    expect(ALL_COMPONENT_TYPES).toContain('Row');
    expect(ALL_COMPONENT_TYPES).toContain('Column');
    expect(ALL_COMPONENT_TYPES).toContain('Stack');
    expect(ALL_COMPONENT_TYPES).toContain('Grid');
    expect(ALL_COMPONENT_TYPES).toContain('Spacer');
  });

  it('ALL_COMPONENT_TYPES includes all expected content components', () => {
    expect(ALL_COMPONENT_TYPES).toContain('Text');
    expect(ALL_COMPONENT_TYPES).toContain('Image');
    expect(ALL_COMPONENT_TYPES).toContain('Icon');
    expect(ALL_COMPONENT_TYPES).toContain('Divider');
  });

  it('ALL_COMPONENT_TYPES includes all expected display components', () => {
    expect(ALL_COMPONENT_TYPES).toContain('ProgressBar');
    expect(ALL_COMPONENT_TYPES).toContain('Badge');
    expect(ALL_COMPONENT_TYPES).toContain('Avatar');
    expect(ALL_COMPONENT_TYPES).toContain('Chip');
  });

  it('ALL_COMPONENT_TYPES includes interaction and structural components', () => {
    expect(ALL_COMPONENT_TYPES).toContain('Button');
    expect(ALL_COMPONENT_TYPES).toContain('Toggle');
    expect(ALL_COMPONENT_TYPES).toContain('Accordion');
    expect(ALL_COMPONENT_TYPES).toContain('Tabs');
    expect(ALL_COMPONENT_TYPES).toContain('Switch');
  });

  it('FORBIDDEN_STYLE_PROPERTIES contains expected entries', () => {
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('backgroundImage');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('cursor');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('listStyleImage');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('content');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('filter');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('backdropFilter');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('mixBlendMode');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('animation');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('transition');
    expect(FORBIDDEN_STYLE_PROPERTIES).toContain('mask');
  });

  it('FORBIDDEN_STYLE_PROPERTIES contains exactly 10 entries', () => {
    expect(FORBIDDEN_STYLE_PROPERTIES).toHaveLength(10);
  });

  it('ALLOWED_FONT_FAMILIES contains the expected font tokens', () => {
    expect(ALLOWED_FONT_FAMILIES).toEqual([
      'sans',
      'serif',
      'mono',
      'rounded',
      'display',
      'handwriting',
    ]);
  });

  it('ALLOWED_TRANSITION_PROPERTIES includes textShadow', () => {
    expect(ALLOWED_TRANSITION_PROPERTIES).toContain('textShadow');
  });

  it('ALLOWED_TRANSITION_PROPERTIES is derived from direct renderable properties', () => {
    expect(ALLOWED_TRANSITION_PROPERTIES).toEqual([
      ...DIRECT_RENDERABLE_STYLE_PROPERTIES,
      'textShadow',
    ]);
  });

  it('RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES captures the responsive-only exclusions', () => {
    expect(RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES).toEqual(['hoverStyle', 'transition']);
  });

  it('ALLOWED_TRANSITION_EASINGS matches the schema and renderer contract', () => {
    expect(ALLOWED_TRANSITION_EASINGS).toEqual([
      'ease',
      'linear',
      'ease-in',
      'ease-out',
      'ease-in-out',
    ]);
  });

  it('shared enum value lists cover the renderer-facing scalar domains', () => {
    expect(ALLOWED_POSITION_VALUES).toEqual(['static', 'relative', 'absolute']);
    expect(ALLOWED_OVERFLOW_VALUES).toEqual(['visible', 'hidden', 'auto']);
    expect(ALLOWED_DISPLAY_VALUES).toEqual(['flex', 'block', 'none']);
    expect(ALLOWED_OBJECT_FIT_VALUES).toEqual(['cover', 'contain', 'fill', 'none', 'scale-down']);
    expect(ALLOWED_BORDER_STYLE_VALUES).toEqual(['solid', 'dashed', 'dotted', 'none']);
  });

  it('LENGTH_AUTO_STYLE_PROPERTIES captures the shared auto-capable size properties', () => {
    expect(LENGTH_AUTO_STYLE_PROPERTIES).toEqual([
      'width',
      'height',
      'minWidth',
      'maxWidth',
      'minHeight',
      'maxHeight',
      'margin',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
    ]);
  });

  it('TEXT_SPAN_STYLE_PROPERTIES stays aligned with the text span schema keys', () => {
    expect(TEXT_SPAN_STYLE_PROPERTIES).toEqual(Object.keys(textSpanStyleSchema.shape));
  });

  it('COLOR_STYLE_PROPERTIES and LENGTH_STYLE_PROPERTIES expose shared validator categories', () => {
    expect(COLOR_STYLE_PROPERTIES).toEqual(['backgroundColor', 'color']);
    expect(LENGTH_STYLE_PROPERTIES).toContain('width');
    expect(LENGTH_STYLE_PROPERTIES).toContain('lineHeight');
    expect(LENGTH_STYLE_PROPERTIES).not.toContain('fontSize');
  });

  it('RANGE_LIMITED_LENGTH_STYLE_PROPERTIES tracks the capped length properties', () => {
    expect(Object.keys(RANGE_LIMITED_LENGTH_STYLE_PROPERTIES)).toEqual([
      'fontSize',
      'letterSpacing',
      'borderRadius',
      'borderRadiusTopLeft',
      'borderRadiusTopRight',
      'borderRadiusBottomLeft',
      'borderRadiusBottomRight',
    ]);
  });
});
