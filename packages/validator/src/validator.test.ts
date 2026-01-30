import { describe, it, expect } from 'vitest';
import {
  validate,
  validateRaw,
  validateSchema,
  validateNodes,
  validateValueTypes,
  validateStyles,
  validateSecurity,
  validateLimits,
  validateExprConstraints,
  createError,
  toResult,
} from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(
  views: Record<string, unknown>,
  state?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    meta: { name: 'test', version: '1.0.0' },
    views,
    ...(state !== undefined ? { state } : {}),
  };
}

function makeViews(rootNode: Record<string, unknown>): Record<string, unknown> {
  return { Main: rootNode };
}

/** Return error codes from an error array. */
function codes(errors: { code: string }[]): string[] {
  return errors.map((e) => e.code);
}

// ===========================================================================
// 1. Schema validation (validateSchema)
// ===========================================================================

describe('validateSchema', () => {
  it('accepts a minimal valid card', () => {
    const card = { meta: { name: 'test', version: '1.0.0' }, views: { Main: { type: 'Box' } } };
    const result = validateSchema(card);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-object input', () => {
    const result = validateSchema('not an object');
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
  });

  it('rejects null input', () => {
    const result = validateSchema(null);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
  });

  it('rejects array input', () => {
    const result = validateSchema([1, 2, 3]);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
  });

  it('rejects missing meta', () => {
    const result = validateSchema({ views: { Main: { type: 'Box' } } });
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('MISSING_FIELD');
    expect(result.errors.some((e) => e.path === 'meta')).toBe(true);
  });

  it('rejects missing views', () => {
    const result = validateSchema({ meta: { name: 'test', version: '1.0.0' } });
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('MISSING_FIELD');
    expect(result.errors.some((e) => e.path === 'views')).toBe(true);
  });

  it('rejects empty views object', () => {
    const result = validateSchema({ meta: { name: 'test', version: '1.0.0' }, views: {} });
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('MISSING_FIELD');
  });

  it('rejects meta.name not being a string', () => {
    const result = validateSchema({
      meta: { name: 123, version: '1.0.0' },
      views: { Main: { type: 'Box' } },
    });
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('MISSING_FIELD');
    expect(result.errors.some((e) => e.path === 'meta.name')).toBe(true);
  });

  it('rejects meta.version not being a string', () => {
    const result = validateSchema({
      meta: { name: 'test', version: 42 },
      views: { Main: { type: 'Box' } },
    });
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('MISSING_FIELD');
    expect(result.errors.some((e) => e.path === 'meta.version')).toBe(true);
  });
});

// ===========================================================================
// 2. Node validation (validateNodes)
// ===========================================================================

describe('validateNodes', () => {
  it('accepts a valid Box node', () => {
    const views = makeViews({ type: 'Box' });
    const errors = validateNodes(views);
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid Text node with content prop', () => {
    const views = makeViews({ type: 'Text', props: { content: 'Hello' } });
    const errors = validateNodes(views);
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid Image node with src prop', () => {
    const views = makeViews({ type: 'Image', props: { src: '@assets/logo.png' } });
    const errors = validateNodes(views);
    expect(errors).toHaveLength(0);
  });

  it('rejects an unknown node type', () => {
    const views = makeViews({ type: 'Banana' });
    const errors = validateNodes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('UNKNOWN_NODE_TYPE');
    expect(errors[0].message).toContain('Banana');
  });

  it('rejects a Text node without content prop', () => {
    const views = makeViews({ type: 'Text' });
    const errors = validateNodes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('MISSING_FIELD');
    expect(errors.some((e) => e.path.includes('props'))).toBe(true);
  });

  it('rejects a Text node with props object but missing content', () => {
    const views = makeViews({ type: 'Text', props: { somethingElse: 'hi' } });
    const errors = validateNodes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('MISSING_FIELD');
    expect(errors.some((e) => e.path.includes('content'))).toBe(true);
  });

  it('rejects an Image node without src prop', () => {
    const views = makeViews({ type: 'Image' });
    const errors = validateNodes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('MISSING_FIELD');
  });

  it('accepts a valid ForLoop', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const errors = validateNodes(views);
    expect(errors).toHaveLength(0);
  });

  it('rejects a ForLoop with "in" not starting with $', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: 'items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const errors = validateNodes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('INVALID_VALUE');
    expect(errors.some((e) => e.path.includes('children.in'))).toBe(true);
  });

  it('rejects a ForLoop with non-string "for"', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 123,
        in: '$items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const errors = validateNodes(views);
    expect(codes(errors)).toContain('INVALID_VALUE');
    expect(errors.some((e) => e.path.includes('children.for'))).toBe(true);
  });

  it('rejects a ForLoop with invalid template (no type)', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { notAType: 'wrong' },
      },
    });
    const errors = validateNodes(views);
    expect(codes(errors)).toContain('INVALID_VALUE');
    expect(errors.some((e) => e.path.includes('children.template'))).toBe(true);
  });
});

// ===========================================================================
// 3. Value types (validateValueTypes)
// ===========================================================================

describe('validateValueTypes', () => {
  it('accepts static style properties', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'relative', top: 10, zIndex: 5 },
    });
    const errors = validateValueTypes(views);
    expect(errors).toHaveLength(0);
  });

  it('rejects $ref on a static-only style property (position)', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: { $ref: '$x' } },
    });
    const errors = validateValueTypes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('DYNAMIC_NOT_ALLOWED');
  });

  it('rejects $expr on a static-only style property (zIndex)', () => {
    const views = makeViews({
      type: 'Box',
      style: { zIndex: { $expr: '$a + 1' } },
    });
    const errors = validateValueTypes(views);
    expect(codes(errors)).toContain('DYNAMIC_NOT_ALLOWED');
  });

  it('rejects $ref on a static-only style property (overflow)', () => {
    const views = makeViews({
      type: 'Box',
      style: { overflow: { $ref: '$x' } },
    });
    const errors = validateValueTypes(views);
    expect(codes(errors)).toContain('DYNAMIC_NOT_ALLOWED');
  });

  it('rejects $expr on Image.src', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $expr: '$url + ".png"' } },
    });
    const errors = validateValueTypes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('EXPR_NOT_ALLOWED');
  });

  it('rejects $ref on Icon.name', () => {
    const views = makeViews({
      type: 'Icon',
      props: { name: { $ref: '$x' } },
    });
    const errors = validateValueTypes(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('REF_NOT_ALLOWED');
  });

  it('rejects $expr on Icon.name', () => {
    const views = makeViews({
      type: 'Icon',
      props: { name: { $expr: '$iconName' } },
    });
    const errors = validateValueTypes(views);
    expect(codes(errors)).toContain('EXPR_NOT_ALLOWED');
  });

  it('allows $ref on Text.content', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$x' } },
    });
    const errors = validateValueTypes(views);
    expect(errors).toHaveLength(0);
  });

  it('allows $expr on Text.content', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$name' } },
    });
    const errors = validateValueTypes(views);
    expect(errors).toHaveLength(0);
  });

  it('allows $ref on Image.src', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $ref: '$imgPath' } },
    });
    const errors = validateValueTypes(views);
    expect(errors).toHaveLength(0);
  });
});

// ===========================================================================
// 4. Style validation (validateStyles)
// ===========================================================================

describe('validateStyles', () => {
  it('accepts valid basic styles', () => {
    const views = makeViews({
      type: 'Box',
      style: { fontSize: 16, opacity: 0.5, zIndex: 10 },
    });
    const errors = validateStyles(views);
    expect(errors).toHaveLength(0);
  });

  it('rejects forbidden property backgroundImage', () => {
    const views = makeViews({
      type: 'Box',
      style: { backgroundImage: 'something' },
    });
    const errors = validateStyles(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('FORBIDDEN_STYLE_PROPERTY');
  });

  it('rejects forbidden property filter', () => {
    const views = makeViews({
      type: 'Box',
      style: { filter: 'blur(5px)' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('FORBIDDEN_STYLE_PROPERTY');
  });

  it('rejects zIndex out of range (negative)', () => {
    const views = makeViews({
      type: 'Box',
      style: { zIndex: -1 },
    });
    const errors = validateStyles(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('rejects zIndex out of range (too high)', () => {
    const views = makeViews({
      type: 'Box',
      style: { zIndex: 200 },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('accepts zIndex at boundaries (0 and 100)', () => {
    const views0 = makeViews({ type: 'Box', style: { zIndex: 0 } });
    const views100 = makeViews({ type: 'Box', style: { zIndex: 100 } });
    expect(validateStyles(views0)).toHaveLength(0);
    expect(validateStyles(views100)).toHaveLength(0);
  });

  it('rejects fontSize out of range (too small)', () => {
    const views = makeViews({
      type: 'Box',
      style: { fontSize: 4 },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('rejects fontSize out of range (too large)', () => {
    const views = makeViews({
      type: 'Box',
      style: { fontSize: 100 },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('accepts fontSize at boundaries (8 and 72)', () => {
    const views8 = makeViews({ type: 'Box', style: { fontSize: 8 } });
    const views72 = makeViews({ type: 'Box', style: { fontSize: 72 } });
    expect(validateStyles(views8)).toHaveLength(0);
    expect(validateStyles(views72)).toHaveLength(0);
  });

  it('rejects transform.skew', () => {
    const views = makeViews({
      type: 'Box',
      style: { transform: { skew: 10 } },
    });
    const errors = validateStyles(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('TRANSFORM_SKEW_FORBIDDEN');
  });

  it('rejects boxShadow array with > 5 entries', () => {
    const shadows = Array.from({ length: 6 }, () => ({
      offsetX: 1,
      offsetY: 1,
      blur: 2,
      spread: 1,
      color: '#000',
    }));
    const views = makeViews({
      type: 'Box',
      style: { boxShadow: shadows },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
    expect(errors.some((e) => e.message.includes('6'))).toBe(true);
  });

  it('accepts boxShadow array with exactly 5 entries', () => {
    const shadows = Array.from({ length: 5 }, () => ({
      offsetX: 1,
      offsetY: 1,
      blur: 2,
      spread: 1,
      color: '#000',
    }));
    const views = makeViews({
      type: 'Box',
      style: { boxShadow: shadows },
    });
    const errors = validateStyles(views);
    // No count error (there may be other errors but not count)
    expect(errors.filter((e) => e.message.includes('entries'))).toHaveLength(0);
  });

  it('rejects style string containing calc(', () => {
    const views = makeViews({
      type: 'Box',
      style: { width: 'calc(100% - 20px)' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('FORBIDDEN_CSS_FUNCTION');
  });

  it('rejects style string containing var(', () => {
    const views = makeViews({
      type: 'Box',
      style: { color: 'var(--main-color)' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('FORBIDDEN_CSS_FUNCTION');
  });

  it('rejects overflow: scroll', () => {
    const views = makeViews({
      type: 'Box',
      style: { overflow: 'scroll' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('FORBIDDEN_OVERFLOW_VALUE');
  });

  it('accepts overflow: auto', () => {
    const views = makeViews({
      type: 'Box',
      style: { overflow: 'auto' },
    });
    const errors = validateStyles(views);
    expect(errors.filter((e) => e.code === 'FORBIDDEN_OVERFLOW_VALUE')).toHaveLength(0);
  });

  it('accepts overflow: hidden', () => {
    const views = makeViews({
      type: 'Box',
      style: { overflow: 'hidden' },
    });
    const errors = validateStyles(views);
    expect(errors.filter((e) => e.code === 'FORBIDDEN_OVERFLOW_VALUE')).toHaveLength(0);
  });

  it('rejects opacity out of range', () => {
    const views = makeViews({
      type: 'Box',
      style: { opacity: 1.5 },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });
});

// ===========================================================================
// 5. Security validation (validateSecurity)
// ===========================================================================

describe('validateSecurity', () => {
  it('rejects Image src with https:// URL', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'https://evil.com/img.png' },
    });
    const errors = validateSecurity(views);
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with http:// URL', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'http://evil.com/img.png' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with javascript: protocol', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'javascript:alert(1)' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with data: protocol', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'data:image/png;base64,abc' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with protocol-relative URL', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '//evil.com/img.png' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with path traversal (no @assets/)', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '../../../etc/passwd' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('INVALID_ASSET_PATH');
  });

  it('rejects Image src @assets/../secret (path traversal)', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '@assets/../secret' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('ASSET_PATH_TRAVERSAL');
  });

  it('accepts Image src @assets/avatar.png', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '@assets/avatar.png' },
    });
    const errors = validateSecurity(views);
    const srcErrors = errors.filter(
      (e) => e.code === 'EXTERNAL_URL' || e.code === 'INVALID_ASSET_PATH' || e.code === 'ASSET_PATH_TRAVERSAL',
    );
    expect(srcErrors).toHaveLength(0);
  });

  it('rejects style with url() function', () => {
    const views = makeViews({
      type: 'Box',
      style: { background: 'url(https://evil.com/bg.png)' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('FORBIDDEN_CSS_FUNCTION');
  });

  it('rejects position: fixed', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'fixed' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('POSITION_FIXED_FORBIDDEN');
  });

  it('rejects position: sticky', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'sticky' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('POSITION_STICKY_FORBIDDEN');
  });

  it('rejects position: absolute outside Stack', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'absolute' },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('POSITION_ABSOLUTE_NOT_IN_STACK');
  });

  it('accepts position: absolute inside Stack child', () => {
    const views = makeViews({
      type: 'Stack',
      children: [{ type: 'Box', style: { position: 'absolute' } }],
    });
    const errors = validateSecurity(views);
    const posErrors = errors.filter((e) => e.code === 'POSITION_ABSOLUTE_NOT_IN_STACK');
    expect(posErrors).toHaveLength(0);
  });

  it('rejects nested overflow:auto', () => {
    const views = makeViews({
      type: 'Box',
      style: { overflow: 'auto' },
      children: [
        {
          type: 'Box',
          style: { overflow: 'auto' },
        },
      ],
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('OVERFLOW_AUTO_NESTED');
  });

  it('rejects $ref with __proto__', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.__proto__' } },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });

  it('rejects $ref with constructor', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.constructor' } },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });

  it('rejects $ref with prototype', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.prototype' } },
    });
    const errors = validateSecurity(views);
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });

  it('accepts $ref without prototype pollution segments', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.name' } },
    });
    const errors = validateSecurity(views);
    const pollutionErrors = errors.filter((e) => e.code === 'PROTOTYPE_POLLUTION');
    expect(pollutionErrors).toHaveLength(0);
  });
});

// ===========================================================================
// 6. Limits validation (validateLimits)
// ===========================================================================

describe('validateLimits', () => {
  it('accepts a small card with a few nodes', () => {
    const views = makeViews({
      type: 'Box',
      children: [
        { type: 'Text', props: { content: 'Hello' } },
        { type: 'Text', props: { content: 'World' } },
      ],
    });
    const errors = validateLimits({ views });
    expect(errors).toHaveLength(0);
  });

  it('rejects overflow:auto count > 2', () => {
    const views = makeViews({
      type: 'Box',
      children: [
        { type: 'Box', style: { overflow: 'auto' } },
        { type: 'Box', style: { overflow: 'auto' } },
        { type: 'Box', style: { overflow: 'auto' } },
      ],
    });
    const errors = validateLimits({ views });
    expect(codes(errors)).toContain('OVERFLOW_AUTO_COUNT_EXCEEDED');
  });

  it('accepts overflow:auto count exactly 2', () => {
    const views = makeViews({
      type: 'Box',
      children: [
        { type: 'Box', style: { overflow: 'auto' } },
        { type: 'Box', style: { overflow: 'auto' } },
      ],
    });
    const errors = validateLimits({ views });
    const overflowErrors = errors.filter((e) => e.code === 'OVERFLOW_AUTO_COUNT_EXCEEDED');
    expect(overflowErrors).toHaveLength(0);
  });

  it('rejects Stack nesting > 3 levels deep', () => {
    // Need 4 levels of Stack nesting to trigger the error (MAX_STACK_NESTING=3)
    // Root Stack stackDepth=0, child Stack stackDepth=1, grandchild Stack stackDepth=2,
    // great-grandchild Stack stackDepth=3 -> 3 >= 3 triggers error
    const views = makeViews({
      type: 'Stack',
      children: [
        {
          type: 'Stack',
          children: [
            {
              type: 'Stack',
              children: [
                {
                  type: 'Stack', // this is the 4th level, stackDepth=3 -> error
                  children: [{ type: 'Box' }],
                },
              ],
            },
          ],
        },
      ],
    });
    const errors = validateLimits({ views });
    expect(codes(errors)).toContain('STACK_NESTING_EXCEEDED');
  });

  it('accepts Stack nesting at exactly 3 levels', () => {
    // 3 levels: root Stack (depth=0), child Stack (depth=1), grandchild Stack (depth=2)
    // depth 2 < 3, so no error
    const views = makeViews({
      type: 'Stack',
      children: [
        {
          type: 'Stack',
          children: [
            {
              type: 'Stack',
              children: [{ type: 'Box' }],
            },
          ],
        },
      ],
    });
    const errors = validateLimits({ views });
    const stackErrors = errors.filter((e) => e.code === 'STACK_NESTING_EXCEEDED');
    expect(stackErrors).toHaveLength(0);
  });

  it('reports LOOP_SOURCE_MISSING when state key does not exist', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    // No state at all
    const errors = validateLimits({ views });
    expect(codes(errors)).toContain('LOOP_SOURCE_MISSING');
  });

  it('reports LOOP_SOURCE_NOT_ARRAY when state value is not array', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const errors = validateLimits({ views, state: { items: 'not an array' } });
    expect(codes(errors)).toContain('LOOP_SOURCE_NOT_ARRAY');
  });

  it('accepts loop with state array within iteration limit', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const errors = validateLimits({ views, state: { items: [1, 2, 3] } });
    const loopErrors = errors.filter(
      (e) => e.code === 'LOOP_ITERATIONS_EXCEEDED' || e.code === 'LOOP_SOURCE_MISSING' || e.code === 'LOOP_SOURCE_NOT_ARRAY',
    );
    expect(loopErrors).toHaveLength(0);
  });
});

// ===========================================================================
// 7. Expression constraints (validateExprConstraints)
// ===========================================================================

describe('validateExprConstraints', () => {
  it('accepts a simple expression', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$hp + 10' } },
    });
    const errors = validateExprConstraints(views);
    expect(errors).toHaveLength(0);
  });

  it('accepts if/then/else expression', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: "if $x > 0 then 'positive' else 'negative'" } },
    });
    const errors = validateExprConstraints(views);
    expect(errors).toHaveLength(0);
  });

  it('rejects expr too long (> 500 chars)', () => {
    const longExpr = '$x ' + '+ 1 '.repeat(200); // well over 500 chars
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: longExpr } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_TOO_LONG');
  });

  it('rejects $ref too long (> 500 chars)', () => {
    const longRef = '$' + 'a'.repeat(600);
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: longRef } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('REF_TOO_LONG');
  });

  it('rejects forbidden operator ===', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a === $b' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
    expect(errors.some((e) => e.message.includes('==='))).toBe(true);
  });

  it('rejects forbidden operator !==', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a !== $b' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
    expect(errors.some((e) => e.message.includes('!=='))).toBe(true);
  });

  it('rejects forbidden operator &&', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a && $b' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
    expect(errors.some((e) => e.message.includes('&&'))).toBe(true);
  });

  it('rejects forbidden operator ||', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a || $b' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
    expect(errors.some((e) => e.message.includes('||'))).toBe(true);
  });

  it('rejects forbidden keyword "function"', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: 'function' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
    expect(errors.some((e) => e.message.includes('function'))).toBe(true);
  });

  it('rejects forbidden keyword "new"', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: 'new $obj' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
  });

  it('rejects function call pattern (identifier followed by open paren)', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: 'foo($x)' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FUNCTION_CALL');
    expect(errors.some((e) => e.message.includes('foo('))).toBe(true);
  });

  it('rejects too many tokens (> 50)', () => {
    // Build an expression with more than 50 tokens: $a + 1 + 1 + 1 ...
    const parts = ['$a'];
    for (let i = 0; i < 30; i++) {
      parts.push('+ 1');
    }
    const expr = parts.join(' '); // "$a + 1 + 1 + 1 ..." -> 1 + 30*2 = 61 tokens
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: expr } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_TOO_MANY_TOKENS');
  });

  it('accepts expression with exactly allowed tokens', () => {
    // A simple expression well under 50 tokens
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a + $b - $c * 2' } },
    });
    const errors = validateExprConstraints(views);
    const tokenErrors = errors.filter((e) => e.code === 'EXPR_TOO_MANY_TOKENS');
    expect(tokenErrors).toHaveLength(0);
  });

  it('accepts "and" / "or" / "not" keywords (not forbidden)', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a and $b or not $c' } },
    });
    const errors = validateExprConstraints(views);
    const forbiddenErrors = errors.filter((e) => e.code === 'EXPR_FORBIDDEN_TOKEN');
    expect(forbiddenErrors).toHaveLength(0);
  });

  it('accepts comparison operators == and !=', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$a == 1' } },
    });
    const errors = validateExprConstraints(views);
    const forbiddenErrors = errors.filter((e) => e.code === 'EXPR_FORBIDDEN_TOKEN');
    expect(forbiddenErrors).toHaveLength(0);
  });

  it('validates $ref prototype pollution segments', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$obj.__proto__' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });
});

// ===========================================================================
// 8. Integration: validate() and validateRaw()
// ===========================================================================

describe('validate', () => {
  it('returns valid: true for a valid card', () => {
    const card = makeCard(
      makeViews({ type: 'Box', children: [{ type: 'Text', props: { content: 'Hello' } }] }),
    );
    const result = validate(card);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid: false for a card with unknown node type (caught at schema level)', () => {
    const card = makeCard(makeViews({ type: 'Banana' }));
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Unknown types are caught by Zod schema validation (early return)
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
  });

  it('returns valid: false for a card with forbidden style', () => {
    const card = makeCard(
      makeViews({ type: 'Box', style: { backgroundImage: 'something' } }),
    );
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('FORBIDDEN_STYLE_PROPERTY');
  });

  it('returns valid: false for missing meta (schema level)', () => {
    const result = validate({ views: { Main: { type: 'Box' } } });
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('MISSING_FIELD');
  });

  it('aggregates errors from multiple validation phases', () => {
    // Use valid node types so schema passes, but trigger style + security errors
    const card = makeCard(
      makeViews({
        type: 'Box',
        style: { backgroundImage: 'url(x)', zIndex: -5 },
        children: [{ type: 'Text', props: { content: 'ok' } }],
      }),
    );
    const result = validate(card);
    expect(result.valid).toBe(false);
    // Should have errors from styles (forbidden property + range) and security (url())
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateRaw', () => {
  it('returns valid: true for a valid JSON string', () => {
    const card = makeCard(
      makeViews({ type: 'Box', children: [{ type: 'Text', props: { content: 'Hi' } }] }),
    );
    const result = validateRaw(JSON.stringify(card));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns INVALID_JSON for malformed JSON', () => {
    const result = validateRaw('{ this is not valid json }}}');
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('INVALID_JSON');
  });

  it('returns INVALID_JSON for empty string', () => {
    const result = validateRaw('');
    expect(result.valid).toBe(false);
    // Empty string is not valid JSON
    expect(codes(result.errors)).toContain('INVALID_JSON');
  });

  it('returns CARD_SIZE_EXCEEDED for oversized string', () => {
    // Create a string larger than 1MB (1_000_000 bytes)
    const oversized = 'x'.repeat(1_000_001);
    const result = validateRaw(oversized);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('CARD_SIZE_EXCEEDED');
  });

  it('accepts string just under the size limit', () => {
    // A valid JSON string that is under 1MB. Build a card with padding.
    const card = makeCard(makeViews({ type: 'Box' }));
    const json = JSON.stringify(card);
    // It should be well under 1MB
    expect(json.length).toBeLessThan(1_000_000);
    const result = validateRaw(json);
    expect(result.valid).toBe(true);
  });

  it('returns schema errors for valid JSON but invalid card structure', () => {
    const result = validateRaw(JSON.stringify({ notACard: true }));
    expect(result.valid).toBe(false);
    // Should fail on schema validation
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 9. Utility functions (createError, toResult)
// ===========================================================================

describe('createError', () => {
  it('creates an error with correct code, message, and path', () => {
    const error = createError('SCHEMA_ERROR', 'Something went wrong', 'views.Main');
    expect(error.code).toBe('SCHEMA_ERROR');
    expect(error.message).toBe('Something went wrong');
    expect(error.path).toBe('views.Main');
  });
});

describe('toResult', () => {
  it('returns valid: true for empty errors array', () => {
    const result = toResult([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid: false for non-empty errors array', () => {
    const error = createError('SCHEMA_ERROR', 'test', '');
    const result = toResult([error]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe(error);
  });
});
