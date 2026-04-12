import { describe, expect, it } from 'vitest';
import { validate, validateLimits, validateSchema, validateStyles } from './index.js';

function makeCard(
  views: Record<string, unknown>,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    meta: { name: 'contract-regression', version: '1.0.0' },
    views,
    ...(extra ?? {}),
  };
}

function makeViews(rootNode: Record<string, unknown>): Record<string, unknown> {
  return { Main: rootNode };
}

function codes(errors: { code: string }[]): string[] {
  return errors.map((error) => error.code);
}

describe('contract regressions — validator', () => {
  it('rejects loop-local external asset refs during validate()', () => {
    const card = makeCard(
      makeViews({
        type: 'Column',
        children: {
          for: 'item',
          in: '$items',
          template: {
            type: 'Image',
            src: { $ref: '$item.img' },
          },
        },
      }),
      {
        state: {
          items: [{ img: 'https://evil.com/payload.png' }],
        },
      },
    );

    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('EXTERNAL_URL');
    expect(result.errors.some((error) => error.path.includes('children.template.src'))).toBe(true);
  });

  it('rejects fragment-expanded asset refs that resolve through loop locals', () => {
    const card = makeCard(
      makeViews({
        type: 'Column',
        children: {
          for: 'item',
          in: '$items',
          template: { $use: 'avatar' },
        },
      }),
      {
        fragments: {
          avatar: {
            type: 'Avatar',
            src: { $ref: '$item.img' },
          },
        },
        state: {
          items: [{ img: 'https://evil.com/avatar.png' }],
        },
      },
    );

    const result = validate(card);
    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('EXTERNAL_URL');
    expect(result.errors.some((error) => error.path.includes('children.template.src'))).toBe(true);
  });

  it('rejects unknown style keys at the schema boundary', () => {
    const result = validateSchema(
      makeCard(
        makeViews({
          type: 'Box',
          style: { fontSzie: 12 },
        }),
      ),
    );

    expect(result.valid).toBe(false);
    expect(codes(result.errors)).toContain('SCHEMA_ERROR');
    expect(result.errors.some((error) => error.message.includes('fontSzie'))).toBe(true);
  });

  it('rejects unknown style keys in low-level style validation', () => {
    const errors = validateStyles(
      makeViews({
        type: 'Box',
        style: {
          hoverStyle: { fontSzie: 12 },
        },
        responsive: {
          compact: { widthh: '100%' },
        },
      }),
    );

    expect(codes(errors)).toContain('INVALID_VALUE');
    expect(errors.some((error) => error.path === 'views.Main.style.hoverStyle.fontSzie')).toBe(
      true,
    );
    expect(errors.some((error) => error.path === 'views.Main.responsive.compact.widthh')).toBe(
      true,
    );
  });

  it('rejects cards when compact-mode rendered CSS exceeds the style budget', () => {
    const children = Array.from({ length: 1500 }, () => ({
      type: 'Box',
      responsive: {
        compact: {
          fontFamily: 'handwriting',
        },
      },
    }));

    const errors = validateLimits(
      makeCard(
        makeViews({
          type: 'Column',
          children,
        }),
      ) as any,
    );

    expect(codes(errors)).toContain('STYLE_SIZE_EXCEEDED');
  });

  it('does not double-count compact overrides on top of overwritten default output', () => {
    const defaultCols = '1fr '.repeat(30).trim();
    const compactCols = '2fr '.repeat(30).trim();
    const children = Array.from({ length: 500 }, () => ({
      type: 'Grid',
      style: {
        gridTemplateColumns: defaultCols,
      },
      responsive: {
        compact: {
          gridTemplateColumns: compactCols,
        },
      },
    }));

    const errors = validateLimits(
      makeCard(
        makeViews({
          type: 'Column',
          children,
        }),
      ) as any,
    );

    expect(codes(errors)).not.toContain('STYLE_SIZE_EXCEEDED');
  });
});
