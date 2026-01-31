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

  // --- Fix 4: Color format validation ---

  it('rejects invalid backgroundColor color value', () => {
    const views = makeViews({
      type: 'Box',
      style: { backgroundColor: 'lolwut' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_COLOR');
  });

  it('accepts valid backgroundColor color (case-insensitive named color)', () => {
    const views = makeViews({
      type: 'Box',
      style: { backgroundColor: 'Red' },
    });
    const errors = validateStyles(views);
    const colorErrors = errors.filter((e) => e.code === 'INVALID_COLOR');
    expect(colorErrors).toHaveLength(0);
  });

  it('accepts hex color', () => {
    const views = makeViews({
      type: 'Box',
      style: { backgroundColor: '#ff0000' },
    });
    const errors = validateStyles(views);
    const colorErrors = errors.filter((e) => e.code === 'INVALID_COLOR');
    expect(colorErrors).toHaveLength(0);
  });

  it('accepts rgb() color', () => {
    const views = makeViews({
      type: 'Box',
      style: { color: 'rgb(255, 0, 0)' },
    });
    const errors = validateStyles(views);
    const colorErrors = errors.filter((e) => e.code === 'INVALID_COLOR');
    expect(colorErrors).toHaveLength(0);
  });

  it('accepts transparent keyword', () => {
    const views = makeViews({
      type: 'Box',
      style: { backgroundColor: 'transparent' },
    });
    const errors = validateStyles(views);
    const colorErrors = errors.filter((e) => e.code === 'INVALID_COLOR');
    expect(colorErrors).toHaveLength(0);
  });

  // --- Fix 4: Length format validation ---

  it('rejects invalid length unit (vw)', () => {
    const views = makeViews({
      type: 'Box',
      style: { width: '50vw' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_LENGTH');
  });

  it('accepts auto for width', () => {
    const views = makeViews({
      type: 'Box',
      style: { width: 'auto' },
    });
    const errors = validateStyles(views);
    const lengthErrors = errors.filter((e) => e.code === 'INVALID_LENGTH');
    expect(lengthErrors).toHaveLength(0);
  });

  it('rejects auto for padding', () => {
    const views = makeViews({
      type: 'Box',
      style: { padding: 'auto' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_LENGTH');
  });

  it('accepts valid length with px unit', () => {
    const views = makeViews({
      type: 'Box',
      style: { width: '100px' },
    });
    const errors = validateStyles(views);
    const lengthErrors = errors.filter((e) => e.code === 'INVALID_LENGTH');
    expect(lengthErrors).toHaveLength(0);
  });

  it('accepts valid length with % unit', () => {
    const views = makeViews({
      type: 'Box',
      style: { width: '50%' },
    });
    const errors = validateStyles(views);
    const lengthErrors = errors.filter((e) => e.code === 'INVALID_LENGTH');
    expect(lengthErrors).toHaveLength(0);
  });

  // --- Fix 4: String length range checks ---

  it('rejects fontSize string out of range (too large)', () => {
    const views = makeViews({
      type: 'Box',
      style: { fontSize: '500px' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('rejects fontSize string out of range (too small)', () => {
    const views = makeViews({
      type: 'Box',
      style: { fontSize: '2px' },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('accepts fontSize string within range', () => {
    const views = makeViews({
      type: 'Box',
      style: { fontSize: '16px' },
    });
    const errors = validateStyles(views);
    const rangeErrors = errors.filter((e) => e.code === 'STYLE_VALUE_OUT_OF_RANGE');
    expect(rangeErrors).toHaveLength(0);
  });

  // --- Fix 4: Nested color validation ---

  it('rejects invalid border.color', () => {
    const views = makeViews({
      type: 'Box',
      style: { border: { width: 1, style: 'solid', color: 'notacolor' } },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_COLOR');
  });

  it('rejects invalid borderTop.color', () => {
    const views = makeViews({
      type: 'Box',
      style: { borderTop: { width: 1, style: 'solid', color: 'notacolor' } },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_COLOR');
  });

  it('rejects invalid borderRight.color', () => {
    const views = makeViews({
      type: 'Box',
      style: { borderRight: { width: 2, style: 'dashed', color: 'xyz123' } },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_COLOR');
  });

  it('accepts valid borderBottom.color', () => {
    const views = makeViews({
      type: 'Box',
      style: { borderBottom: { width: 1, style: 'solid', color: '#ff0000' } },
    });
    const errors = validateStyles(views);
    const colorErrors = errors.filter((e) => e.code === 'INVALID_COLOR');
    expect(colorErrors).toHaveLength(0);
  });

  it('rejects invalid boxShadow color', () => {
    const views = makeViews({
      type: 'Box',
      style: { boxShadow: { offsetX: 0, offsetY: 0, blur: 5, color: 'badcolor' } },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_COLOR');
  });

  it('rejects invalid gradient stop color', () => {
    const views = makeViews({
      type: 'Box',
      style: {
        backgroundGradient: {
          type: 'linear',
          direction: '90deg',
          stops: [
            { color: 'invalidcolor', position: '0%' },
            { color: 'blue', position: '100%' },
          ],
        },
      },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('INVALID_COLOR');
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
    const errors = validateSecurity({ views });
    expect(errors.length).toBeGreaterThan(0);
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with http:// URL', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'http://evil.com/img.png' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with javascript: protocol', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'javascript:alert(1)' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with data: protocol', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'data:image/png;base64,abc' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with protocol-relative URL', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '//evil.com/img.png' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects Image src with path traversal (no @assets/)', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '../../../etc/passwd' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('INVALID_ASSET_PATH');
  });

  it('rejects Image src @assets/../secret (path traversal)', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '@assets/../secret' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('ASSET_PATH_TRAVERSAL');
  });

  it('accepts Image src @assets/avatar.png', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '@assets/avatar.png' },
    });
    const errors = validateSecurity({ views });
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
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('FORBIDDEN_CSS_FUNCTION');
  });

  it('rejects position: fixed', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'fixed' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('POSITION_FIXED_FORBIDDEN');
  });

  it('rejects position: sticky', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'sticky' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('POSITION_STICKY_FORBIDDEN');
  });

  it('rejects position: absolute outside Stack', () => {
    const views = makeViews({
      type: 'Box',
      style: { position: 'absolute' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('POSITION_ABSOLUTE_NOT_IN_STACK');
  });

  it('accepts position: absolute inside Stack child', () => {
    const views = makeViews({
      type: 'Stack',
      children: [{ type: 'Box', style: { position: 'absolute' } }],
    });
    const errors = validateSecurity({ views });
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
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('OVERFLOW_AUTO_NESTED');
  });

  it('rejects $ref with __proto__', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.__proto__' } },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });

  it('rejects $ref with constructor', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.constructor' } },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });

  it('rejects $ref with prototype', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.prototype' } },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('PROTOTYPE_POLLUTION');
  });

  it('accepts $ref without prototype pollution segments', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $ref: '$state.name' } },
    });
    const errors = validateSecurity({ views });
    const pollutionErrors = errors.filter((e) => e.code === 'PROTOTYPE_POLLUTION');
    expect(pollutionErrors).toHaveLength(0);
  });

  // --- Fix 1: $ref external URL bypass ---

  it('rejects Image src $ref resolving to external URL via state', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $ref: '$img' } },
    });
    const state = { img: 'https://evil.com/payload.png' };
    const errors = validateSecurity({ views, state });
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('accepts Image src $ref resolving to valid @assets/ path', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $ref: '$img' } },
    });
    const state = { img: '@assets/logo.png' };
    const errors = validateSecurity({ views, state });
    const srcErrors = errors.filter(
      (e) => e.code === 'EXTERNAL_URL' || e.code === 'INVALID_ASSET_PATH' || e.code === 'ASSET_PATH_TRAVERSAL',
    );
    expect(srcErrors).toHaveLength(0);
  });

  it('rejects Image src $ref resolving to path traversal', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $ref: '$img' } },
    });
    const state = { img: '@assets/../secret' };
    const errors = validateSecurity({ views, state });
    expect(codes(errors)).toContain('ASSET_PATH_TRAVERSAL');
  });

  it('skips Image src $ref when state key does not exist (loop-local)', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $ref: '$item.img' } },
    });
    const state = { unrelated: 'value' };
    const errors = validateSecurity({ views, state });
    // Should NOT produce any src-related errors — unresolvable $ref is skipped
    const srcErrors = errors.filter(
      (e) => e.code === 'EXTERNAL_URL' || e.code === 'INVALID_ASSET_PATH' || e.code === 'ASSET_PATH_TRAVERSAL',
    );
    expect(srcErrors).toHaveLength(0);
  });

  it('rejects Image src literal "logo.png" without @assets/ prefix', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: 'logo.png' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('INVALID_ASSET_PATH');
  });

  // --- Fix 5: cardAssets validation ---

  it('rejects cardAssets with external URL value', () => {
    const views = makeViews({ type: 'Box' });
    const cardAssets = { hero: 'https://evil.com/bg.png' };
    const errors = validateSecurity({ views, cardAssets });
    expect(codes(errors)).toContain('INVALID_ASSET_PATH');
  });

  it('rejects cardAssets with path traversal', () => {
    const views = makeViews({ type: 'Box' });
    const cardAssets = { hero: '@assets/../../../etc/passwd' };
    const errors = validateSecurity({ views, cardAssets });
    expect(codes(errors)).toContain('ASSET_PATH_TRAVERSAL');
  });

  it('accepts cardAssets with valid @assets/ paths', () => {
    const views = makeViews({ type: 'Box' });
    const cardAssets = { hero: '@assets/hero.png', logo: '@assets/logo.svg' };
    const errors = validateSecurity({ views, cardAssets });
    const assetErrors = errors.filter(
      (e) => e.code === 'INVALID_ASSET_PATH' || e.code === 'ASSET_PATH_TRAVERSAL',
    );
    expect(assetErrors).toHaveLength(0);
  });

  // --- Fix 6: URL whitespace bypass ---

  it('rejects URL with leading whitespace', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: '  https://evil.com/img.png' },
    });
    const errors = validateSecurity({ views });
    expect(codes(errors)).toContain('EXTERNAL_URL');
  });

  it('rejects $ref resolving to URL with leading whitespace', () => {
    const views = makeViews({
      type: 'Image',
      props: { src: { $ref: '$img' } },
    });
    const state = { img: '  https://evil.com/img.png' };
    const errors = validateSecurity({ views, state });
    expect(codes(errors)).toContain('EXTERNAL_URL');
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

  // --- Fix 3: Bare identifier rejection ---

  it('rejects bare identifier without $ prefix', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: 'foo + 1' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_FORBIDDEN_TOKEN');
    expect(errors.some((e) => e.message.includes('foo') && e.message.includes('$'))).toBe(true);
  });

  it('accepts $-prefixed identifier', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$foo + 1' } },
    });
    const errors = validateExprConstraints(views);
    const bareErrors = errors.filter(
      (e) => e.code === 'EXPR_FORBIDDEN_TOKEN' && e.message.includes('must start with'),
    );
    expect(bareErrors).toHaveLength(0);
  });

  // --- Fix 3: Fractional digit enforcement ---

  it('rejects number literal with > 10 fractional digits', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$x + 3.12345678901' } },
    });
    const errors = validateExprConstraints(views);
    expect(codes(errors)).toContain('EXPR_INVALID_TOKEN');
    expect(errors.some((e) => e.message.includes('fractional'))).toBe(true);
  });

  it('accepts number literal with exactly 10 fractional digits', () => {
    const views = makeViews({
      type: 'Text',
      props: { content: { $expr: '$x + 3.1234567890' } },
    });
    const errors = validateExprConstraints(views);
    const fractErrors = errors.filter(
      (e) => e.code === 'EXPR_INVALID_TOKEN' && e.message.includes('fractional'),
    );
    expect(fractErrors).toHaveLength(0);
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

  it('rejects card with invalid assets via validate() pipeline', () => {
    // Verifies that card.assets (not cardAssets) is properly wired through
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: { Main: { type: 'Box' } },
      assets: { hero: 'https://evil.com/bg.png' },
    };
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('INVALID_ASSET_PATH');
  });

  it('rejects card with $ref Image src resolving to external URL via validate() pipeline', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: {
        Main: {
          type: 'Image',
          props: { src: { $ref: '$img' } },
        },
      },
      state: { img: 'https://evil.com/payload.png' },
    };
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('EXTERNAL_URL');
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

// ===========================================================================
// Phase 2 Tests
// ===========================================================================

// ===========================================================================
// P2-1. $style validation (validateStyles with cardStyles)
// ===========================================================================

describe('validateStyles — $style references', () => {
  it('accepts a card with a valid $style reference', () => {
    const cardStyles = {
      myStyle: { backgroundColor: '#ff0000' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'myStyle' },
    });
    const errors = validateStyles(views, cardStyles);
    expect(errors).toHaveLength(0);
  });

  it('rejects $style used inside card.styles (circular ref)', () => {
    const cardStyles = {
      myStyle: { $style: 'otherStyle' } as Record<string, unknown>,
    };
    const views = makeViews({ type: 'Box' });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('STYLE_CIRCULAR_REF');
  });

  it('rejects $style referencing a nonexistent style name', () => {
    const views = makeViews({
      type: 'Box',
      style: { $style: 'nonexistent' },
    });
    // No cardStyles at all
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_REF_NOT_FOUND');
  });

  it('rejects $style referencing nonexistent style when cardStyles exists but lacks the key', () => {
    const cardStyles = {
      other: { backgroundColor: '#000' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'nonexistent' },
    });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('STYLE_REF_NOT_FOUND');
  });

  it('rejects $style with whitespace-only value', () => {
    const cardStyles = {
      myStyle: { backgroundColor: '#000' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: ' ' },
    });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('INVALID_STYLE_REF');
  });

  it('rejects $style value containing url(', () => {
    const cardStyles = {
      myStyle: { backgroundColor: '#000' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'url(' },
    });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('INVALID_STYLE_REF');
  });

  it('rejects $style value starting with a digit', () => {
    const cardStyles = {
      myStyle: { backgroundColor: '#000' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: '123abc' },
    });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('INVALID_STYLE_REF');
  });

  it('rejects card.styles with empty string key', () => {
    const cardStyles = {
      '': { backgroundColor: '#000' },
    };
    const views = makeViews({ type: 'Box' });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('INVALID_STYLE_NAME');
  });

  it('reports STYLE_VALUE_OUT_OF_RANGE when $style merged result violates range', () => {
    const cardStyles = {
      big: { fontSize: 999 },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'big' },
    });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('reports error when $style merged with inline override violates range', () => {
    const cardStyles = {
      s: { fontSize: 10 },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 's', fontSize: 999 },
    });
    const errors = validateStyles(views, cardStyles);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('rejects borderRadiusTopLeft out of range', () => {
    const views = makeViews({
      type: 'Box',
      style: { borderRadiusTopLeft: 99999 },
    });
    const errors = validateStyles(views);
    expect(codes(errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('accepts borderRadiusTopLeft within range', () => {
    const views = makeViews({
      type: 'Box',
      style: { borderRadiusTopLeft: 100 },
    });
    const errors = validateStyles(views);
    const rangeErrors = errors.filter((e) => e.code === 'STYLE_VALUE_OUT_OF_RANGE');
    expect(rangeErrors).toHaveLength(0);
  });
});

// ===========================================================================
// P2-2. $style security (validateSecurity with cardStyles)
// ===========================================================================

describe('validateSecurity — $style merged position/overflow', () => {
  it('rejects $style with position: absolute outside Stack', () => {
    const cardStyles = {
      absStyle: { position: 'absolute' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'absStyle' },
    });
    const errors = validateSecurity({ views, cardStyles });
    expect(codes(errors)).toContain('POSITION_ABSOLUTE_NOT_IN_STACK');
  });

  it('rejects $style with position: fixed', () => {
    const cardStyles = {
      fixedStyle: { position: 'fixed' },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'fixedStyle' },
    });
    const errors = validateSecurity({ views, cardStyles });
    expect(codes(errors)).toContain('POSITION_FIXED_FORBIDDEN');
  });

  it('rejects $style with nested overflow:auto', () => {
    const cardStyles = {
      autoOverflow: { overflow: 'auto' },
    };
    const views = makeViews({
      type: 'Box',
      style: { overflow: 'auto' },
      children: [
        {
          type: 'Box',
          style: { $style: 'autoOverflow' },
        },
      ],
    });
    const errors = validateSecurity({ views, cardStyles });
    expect(codes(errors)).toContain('OVERFLOW_AUTO_NESTED');
  });

  it('uses merged style from cardStyles for position checks', () => {
    const cardStyles = {
      posStyle: { position: 'absolute' },
    };
    // Inside a Stack, so absolute should be allowed
    const views = makeViews({
      type: 'Stack',
      children: [
        {
          type: 'Box',
          style: { $style: 'posStyle' },
        },
      ],
    });
    const errors = validateSecurity({ views, cardStyles });
    const posErrors = errors.filter((e) => e.code === 'POSITION_ABSOLUTE_NOT_IN_STACK');
    expect(posErrors).toHaveLength(0);
  });
});

// ===========================================================================
// P2-3. $style limits (validateLimits with cardStyles)
// ===========================================================================

describe('validateLimits — $style merged style bytes and overflow', () => {
  it('counts $style merged style bytes toward total style bytes', () => {
    const cardStyles = {
      bigStyle: {
        backgroundColor: '#ff0000',
        color: '#00ff00',
        fontSize: 16,
        padding: '10px',
      },
    };
    const views = makeViews({
      type: 'Box',
      style: { $style: 'bigStyle' },
    });
    // Should not error for a small style, but the merged style should be counted
    const errors = validateLimits({ views, cardStyles });
    const sizeErrors = errors.filter((e) => e.code === 'STYLE_SIZE_EXCEEDED');
    expect(sizeErrors).toHaveLength(0);
  });

  it('counts overflow:auto in $style toward overflow limit', () => {
    const cardStyles = {
      autoScroll: { overflow: 'auto' },
    };
    const views = makeViews({
      type: 'Box',
      children: [
        { type: 'Box', style: { $style: 'autoScroll' } },
        { type: 'Box', style: { $style: 'autoScroll' } },
        { type: 'Box', style: { $style: 'autoScroll' } },
      ],
    });
    const errors = validateLimits({ views, cardStyles });
    expect(codes(errors)).toContain('OVERFLOW_AUTO_COUNT_EXCEEDED');
  });
});

// ===========================================================================
// P2-4. For-loop limits (validateLimits)
// ===========================================================================

describe('validateLimits — for-loop validation', () => {
  it('accepts loop with 5 items x 3 template nodes (15 effective nodes)', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: {
          type: 'Box',
          children: [
            { type: 'Text', props: { content: 'a' } },
            { type: 'Text', props: { content: 'b' } },
          ],
        },
      },
    });
    const state = { items: [1, 2, 3, 4, 5] };
    const errors = validateLimits({ views, state });
    const nodeErrors = errors.filter((e) => e.code === 'NODE_COUNT_EXCEEDED');
    expect(nodeErrors).toHaveLength(0);
  });

  it('resolves dotted path $data.items correctly', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$data.items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const state = { data: { items: [1, 2, 3] } };
    const errors = validateLimits({ views, state });
    const loopErrors = errors.filter(
      (e) =>
        e.code === 'LOOP_SOURCE_MISSING' ||
        e.code === 'LOOP_SOURCE_NOT_ARRAY',
    );
    expect(loopErrors).toHaveLength(0);
  });

  it('skips validation when loop source is a locals/loop variable not in state', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$item.subItems',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    const state = { unrelated: 'value' };
    const errors = validateLimits({ views, state });
    // Should not produce LOOP_SOURCE_MISSING for unresolvable dotted path
    const missingErrors = errors.filter((e) => e.code === 'LOOP_SOURCE_MISSING');
    expect(missingErrors).toHaveLength(0);
  });

  it('reports LOOP_SOURCE_NOT_ARRAY when source is not an array', () => {
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

  it('reports LOOP_ITERATIONS_EXCEEDED when array exceeds MAX_LOOP_ITERATIONS', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text', props: { content: 'hi' } },
      },
    });
    // MAX_LOOP_ITERATIONS is 1000, so 1001 should exceed
    const bigArray = Array.from({ length: 1001 }, (_, i) => i);
    const errors = validateLimits({ views, state: { items: bigArray } });
    expect(codes(errors)).toContain('LOOP_ITERATIONS_EXCEEDED');
  });

  it('reports NESTED_LOOPS_EXCEEDED when loop nesting exceeds MAX_NESTED_LOOPS', () => {
    // MAX_NESTED_LOOPS is 2, so 3 levels of nesting should trigger error
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'a',
        in: '$items',
        template: {
          type: 'Box',
          children: {
            for: 'b',
            in: '$items',
            template: {
              type: 'Box',
              children: {
                for: 'c',
                in: '$items',
                template: { type: 'Text', props: { content: 'deep' } },
              },
            },
          },
        },
      },
    });
    const state = { items: [1, 2] };
    const errors = validateLimits({ views, state });
    expect(codes(errors)).toContain('NESTED_LOOPS_EXCEEDED');
  });
});

// ===========================================================================
// P2-5. Loop expansion multiplier
// ===========================================================================

describe('validateLimits — loop expansion multiplier', () => {
  it('correctly counts node expansion for 100 items x 1 template node', () => {
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text', props: { content: 'x'.repeat(100) } },
      },
    });
    const items = Array.from({ length: 100 }, (_, i) => i);
    const state = { items };
    const errors = validateLimits({ views, state });
    // 100 items x 1 node = 100 nodes + 1 root Box = 101, well under 10000
    const nodeErrors = errors.filter((e) => e.code === 'NODE_COUNT_EXCEEDED');
    expect(nodeErrors).toHaveLength(0);
  });

  it('reports NODE_COUNT_EXCEEDED for loop with too many expanded nodes', () => {
    // MAX_LOOP_ITERATIONS is 1000. Expansion only counts when <= 1000.
    // Use 1000 items x 11 nodes per template = 11000 > MAX_NODE_COUNT (10000).
    // Template: 1 Box + 10 Text children = 11 nodes per iteration.
    const views = makeViews({
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: {
          type: 'Box',
          children: [
            { type: 'Text', props: { content: '1' } },
            { type: 'Text', props: { content: '2' } },
            { type: 'Text', props: { content: '3' } },
            { type: 'Text', props: { content: '4' } },
            { type: 'Text', props: { content: '5' } },
            { type: 'Text', props: { content: '6' } },
            { type: 'Text', props: { content: '7' } },
            { type: 'Text', props: { content: '8' } },
            { type: 'Text', props: { content: '9' } },
            { type: 'Text', props: { content: '10' } },
          ],
        },
      },
    });
    const state = { items: Array.from({ length: 1000 }, (_, i) => i) };
    const errors = validateLimits({ views, state });
    expect(codes(errors)).toContain('NODE_COUNT_EXCEEDED');
  });
});

// ===========================================================================
// P2-6. Grid $ref validation
// ===========================================================================

describe('validateStyles — Grid $ref and literal gridTemplateColumns', () => {
  it('accepts gridTemplateColumns with $ref (dynamic, no error)', () => {
    const views = makeViews({
      type: 'Grid',
      style: { gridTemplateColumns: { $ref: '$cols' } },
    });
    const errors = validateStyles(views);
    const gridErrors = errors.filter(
      (e) =>
        e.code === 'STYLE_VALUE_OUT_OF_RANGE' ||
        e.code === 'FORBIDDEN_STYLE_PROPERTY' ||
        e.code === 'INVALID_LENGTH',
    );
    expect(gridErrors).toHaveLength(0);
  });

  it('accepts gridTemplateColumns with literal repeat() value', () => {
    const views = makeViews({
      type: 'Grid',
      style: { gridTemplateColumns: 'repeat(3, 1fr)' },
    });
    const errors = validateStyles(views);
    const gridErrors = errors.filter(
      (e) =>
        e.code === 'FORBIDDEN_STYLE_PROPERTY',
    );
    expect(gridErrors).toHaveLength(0);
  });
});

// ===========================================================================
// P2-7. Schema validation for card.styles
// ===========================================================================

describe('validate — card.styles integration', () => {
  it('accepts a card with valid styles and $style reference', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      styles: {
        myStyle: { backgroundColor: '#ff0000', fontSize: 16 },
      },
      views: {
        Main: {
          type: 'Box',
          style: { $style: 'myStyle' },
          children: [{ type: 'Text', props: { content: 'Hello' } }],
        },
      },
    };
    const result = validate(card);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a card with styles key starting with a digit (schema error)', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      styles: {
        '1badName': { backgroundColor: '#ff0000' },
      },
      views: {
        Main: { type: 'Box' },
      },
    };
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
  });

  it('rejects a card where $style references a style with fontSize out of range', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      styles: {
        huge: { fontSize: 999 },
      },
      views: {
        Main: {
          type: 'Box',
          style: { $style: 'huge' },
        },
      },
    };
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('STYLE_VALUE_OUT_OF_RANGE');
  });

  it('rejects a card where $style has position: fixed via merged style', () => {
    // position: 'fixed' is not in positionValueSchema ('static' | 'relative' | 'absolute'),
    // so Zod rejects it at schema level before security validation runs.
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      styles: {
        fixedPos: { position: 'fixed' },
      },
      views: {
        Main: {
          type: 'Box',
          style: { $style: 'fixedPos' },
        },
      },
    };
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
  });

  it('rejects a card with loop where source is not an array via validate()', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: {
        Main: {
          type: 'Box',
          children: {
            for: 'item',
            in: '$items',
            template: { type: 'Text', props: { content: 'hi' } },
          },
        },
      },
      state: { items: 42 },
    };
    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('LOOP_SOURCE_NOT_ARRAY');
  });
});
