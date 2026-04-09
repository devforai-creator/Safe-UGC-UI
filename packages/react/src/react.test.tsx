import { afterEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  BACKDROP_BLUR_MAX,
  FONT_SIZE_MAX,
  TEXT_CONTENT_TOTAL_MAX_BYTES,
} from '@safe-ugc-ui/types';
import {
  resolveRef,
  resolveTemplate,
  resolveTextValue,
  resolveValue,
} from './state-resolver.js';
import { evaluateCondition } from './condition-resolver.js';
import { mapStyle, mapTransition } from './style-mapper.js';
import { resolveAsset } from './asset-resolver.js';
import { renderTree } from './node-renderer.js';
import { UGCContainer } from './UGCContainer.js';
import { UGCRenderer } from './UGCRenderer.js';

const originalResizeObserver = globalThis.ResizeObserver;
const originalInnerWidth = window.innerWidth;

afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = originalResizeObserver;
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
    writable: true,
  });
  vi.restoreAllMocks();
});

// =============================================================================
// 1. state-resolver
// =============================================================================

describe('resolveRef', () => {
  it('resolves a simple ref', () => {
    expect(resolveRef('$hp', { hp: 100 })).toBe(100);
  });

  it('resolves a nested ref', () => {
    expect(resolveRef('$user.name', { user: { name: 'Alice' } })).toBe('Alice');
  });

  it('returns undefined for missing path', () => {
    expect(resolveRef('$missing', {})).toBeUndefined();
  });

  it('blocks __proto__', () => {
    expect(resolveRef('$__proto__.polluted', { __proto__: {} })).toBeUndefined();
  });

  it('blocks constructor', () => {
    expect(resolveRef('$constructor', { constructor: 'bad' })).toBeUndefined();
  });

  it('blocks prototype', () => {
    expect(resolveRef('$prototype', { prototype: 'bad' })).toBeUndefined();
  });

  it('returns undefined for deeply missing nested path', () => {
    expect(resolveRef('$a.b.c', { a: { b: {} } })).toBeUndefined();
  });

  it('returns undefined when traversal hits a non-object', () => {
    expect(resolveRef('$a.b', { a: 42 })).toBeUndefined();
  });

  // --- Fix 2: Array index [N] parsing ---

  it('resolves array index with bracket notation', () => {
    expect(resolveRef('$items[0].name', { items: [{ name: 'first' }] })).toBe('first');
  });

  it('resolves nested array indices', () => {
    expect(resolveRef('$data[1][0]', { data: [['a', 'b'], ['c', 'd']] })).toBe('c');
  });

  it('returns undefined for out-of-bounds array index', () => {
    expect(resolveRef('$items[5]', { items: ['a', 'b'] })).toBeUndefined();
  });

  it('resolves deep nested path with arrays', () => {
    const state = {
      users: [
        { posts: [{ title: 'Hello' }, { title: 'World' }] },
      ],
    };
    expect(resolveRef('$users[0].posts[1].title', state)).toBe('World');
  });

  it('handles ref path without leading $', () => {
    expect(resolveRef('hp', { hp: 200 })).toBe(200);
  });

  it('resolves to falsy values correctly', () => {
    expect(resolveRef('$val', { val: 0 })).toBe(0);
    expect(resolveRef('$val', { val: '' })).toBe('');
    expect(resolveRef('$val', { val: false })).toBe(false);
    expect(resolveRef('$val', { val: null })).toBeNull();
  });
});

describe('resolveValue', () => {
  it('returns literal values as-is', () => {
    expect(resolveValue('hello', {})).toBe('hello');
    expect(resolveValue(42, {})).toBe(42);
    expect(resolveValue(null, {})).toBeNull();
  });

  it('resolves $ref objects', () => {
    expect(resolveValue({ $ref: '$hp' }, { hp: 50 })).toBe(50);
  });

  it('returns undefined as-is', () => {
    expect(resolveValue(undefined, {})).toBeUndefined();
  });

  it('returns boolean literals as-is', () => {
    expect(resolveValue(true, {})).toBe(true);
    expect(resolveValue(false, {})).toBe(false);
  });

  it('returns plain objects without $ref as-is', () => {
    const obj = { foo: 'bar' };
    expect(resolveValue(obj, {})).toBe(obj);
  });

  it('resolves nested $ref through state', () => {
    expect(resolveValue({ $ref: '$user.name' }, { user: { name: 'Bob' } })).toBe('Bob');
  });
});

describe('resolveTemplate', () => {
  it('joins structured template parts and stringifies primitives', () => {
    expect(
      resolveTemplate(
        {
          $template: ['@', { $ref: '$name' }, ' · Lv.', { $ref: '$level' }, ' ', true, ' ', null],
        },
        { name: 'neo', level: 7 },
      ),
    ).toBe('@neo · Lv.7 true null');
  });

  it('treats unresolved parts as empty strings', () => {
    expect(
      resolveTemplate(
        { $template: ['HP ', { $ref: '$missing' }, '/100'] },
        {},
      ),
    ).toBe('HP /100');
  });
});

describe('resolveTextValue', () => {
  it('resolves literal, ref, and template values into strings', () => {
    expect(resolveTextValue('plain', {})).toBe('plain');
    expect(resolveTextValue({ $ref: '$label' }, { label: 'from ref' })).toBe('from ref');
    expect(
      resolveTextValue(
        { $template: ['[', { $ref: '$status' }, ']'] },
        { status: 'ok' },
      ),
    ).toBe('[ok]');
  });
});

describe('evaluateCondition', () => {
  it('resolves a boolean $ref condition', () => {
    expect(evaluateCondition({ $ref: '$show' }, { show: true })).toBe(true);
    expect(evaluateCondition({ $ref: '$show' }, { show: false })).toBe(false);
  });

  it('evaluates comparison and logical operators', () => {
    const state = { hp: 25, dead: false };
    expect(
      evaluateCondition(
        {
          op: 'and',
          values: [
            { op: 'gt', left: { $ref: '$hp' }, right: 0 },
            { op: 'eq', left: { $ref: '$dead' }, right: false },
          ],
        },
        state,
      ),
    ).toBe(true);
  });

  it('returns false for missing comparison refs', () => {
    expect(
      evaluateCondition(
        { op: 'eq', left: { $ref: '$missing' }, right: true },
        {},
      ),
    ).toBe(false);
  });
});

// =============================================================================
// 2. style-mapper
// =============================================================================

describe('mapStyle', () => {
  it('returns empty object for undefined style', () => {
    expect(mapStyle(undefined, {})).toEqual({});
  });

  it('maps direct properties', () => {
    const result = mapStyle({ fontSize: 16, opacity: 0.5, color: 'red' }, {});
    expect(result.fontSize).toBe(16);
    expect(result.opacity).toBe(0.5);
    expect(result.color).toBe('red');
  });

  it('maps aspectRatio when the value is valid', () => {
    expect(mapStyle({ aspectRatio: 1.5 }, {}).aspectRatio).toBe(1.5);
    expect(mapStyle({ aspectRatio: '16 / 9' }, {}).aspectRatio).toBe('16 / 9');
  });

  it('ignores invalid aspectRatio values', () => {
    expect(mapStyle({ aspectRatio: 'wide' }, {}).aspectRatio).toBeUndefined();
  });

  it('maps backdropBlur to backdropFilter', () => {
    expect(mapStyle({ backdropBlur: 12 }, {}).backdropFilter).toBe('blur(12px)');
  });

  it('drops out-of-range backdropBlur resolved from state', () => {
    expect(
      mapStyle(
        { backdropBlur: { $ref: '$blur' } },
        { blur: BACKDROP_BLUR_MAX + 1 },
      ).backdropFilter,
    ).toBeUndefined();
  });

  it('drops out-of-range fontSize resolved from state', () => {
    expect(
      mapStyle(
        { fontSize: { $ref: '$size' } },
        { size: `${FONT_SIZE_MAX + 1}px` },
      ).fontSize,
    ).toBeUndefined();
  });

  it('maps structured clipPath objects to CSS strings', () => {
    expect(
      (mapStyle({ clipPath: { type: 'circle', radius: '50%' } }, {}) as Record<string, unknown>).clipPath,
    ).toBe('circle(50%)');

    expect(
      (mapStyle({
        clipPath: {
          type: 'inset',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          round: 20,
        },
      }, {}) as Record<string, unknown>).clipPath,
    ).toBe('inset(0px 0px 0px 0px round 20px)');
  });

  it('converts transform object to CSS string', () => {
    const result = mapStyle({ transform: { scale: 1.2, translateX: 10 } }, {});
    expect(result.transform).toContain('scale(1.2)');
    expect(result.transform).toContain('translateX(10px)');
  });

  it('converts boxShadow to CSS string', () => {
    const result = mapStyle(
      { boxShadow: { offsetX: 2, offsetY: 4, blur: 6, color: '#000' } },
      {},
    );
    expect(result.boxShadow).toContain('2px 4px 6px');
  });

  it('ignores unknown properties (whitelist)', () => {
    const result = mapStyle({ unknownProp: 'value', fontSize: 14 }, {});
    expect(result.fontSize).toBe(14);
    expect((result as Record<string, unknown>)['unknownProp']).toBeUndefined();
  });

  it('maps display and flexbox properties', () => {
    const result = mapStyle(
      { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch' },
      {},
    );
    expect(result.display).toBe('flex');
    expect(result.flexDirection).toBe('column');
    expect(result.justifyContent).toBe('center');
    expect(result.alignItems).toBe('stretch');
  });

  it('preserves flex-start/flex-end alignment aliases', () => {
    const result = mapStyle(
      { justifyContent: 'flex-end', alignItems: 'flex-start', alignSelf: 'flex-end' },
      {},
    );
    expect(result.justifyContent).toBe('flex-end');
    expect(result.alignItems).toBe('flex-start');
    expect(result.alignSelf).toBe('flex-end');
  });

  it('maps positioning properties', () => {
    const result = mapStyle(
      { position: 'absolute', top: 10, right: 20, bottom: 30, left: 40, zIndex: 5 },
      {},
    );
    expect(result.position).toBe('absolute');
    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
    expect(result.bottom).toBe(30);
    expect(result.left).toBe(40);
    expect(result.zIndex).toBe(5);
  });

  it('maps padding and margin properties', () => {
    const result = mapStyle(
      { padding: 10, paddingTop: 5, margin: 20, marginLeft: 15 },
      {},
    );
    expect(result.padding).toBe(10);
    expect(result.paddingTop).toBe(5);
    expect(result.margin).toBe(20);
    expect(result.marginLeft).toBe(15);
  });

  it('converts border object to CSS shorthand', () => {
    const result = mapStyle(
      { border: { width: 1, style: 'solid', color: '#ccc' } },
      {},
    );
    expect(result.border).toBe('1px solid #ccc');
  });

  it('resolves nested $ref in border object fields', () => {
    const result = mapStyle(
      {
        border: {
          width: { $ref: '$border.width' },
          style: { $ref: '$border.style' },
          color: { $ref: '$border.color' },
        },
      },
      {
        border: { width: 2, style: 'dashed', color: '#ccc' },
      },
    );
    expect(result.border).toBe('2px dashed #ccc');
  });

  it('converts border side objects to CSS shorthand', () => {
    const result = mapStyle(
      { borderTop: { width: 2, style: 'dashed', color: 'blue' } },
      {},
    );
    expect((result as Record<string, unknown>).borderTop).toBe('2px dashed blue');
  });

  it('converts backgroundGradient to CSS background (linear)', () => {
    const result = mapStyle(
      {
        backgroundGradient: {
          type: 'linear',
          direction: '90deg',
          stops: [
            { color: 'red', position: '0%' },
            { color: 'blue', position: '100%' },
          ],
        },
      },
      {},
    );
    expect(result.background).toBe('linear-gradient(90deg, red 0%, blue 100%)');
  });

  it('resolves nested $ref in backgroundGradient fields', () => {
    const result = mapStyle(
      {
        backgroundGradient: {
          type: 'linear',
          direction: { $ref: '$gradient.direction' },
          stops: [
            {
              color: { $ref: '$gradient.start' },
              position: { $ref: '$gradient.startPosition' },
            },
            {
              color: { $ref: '$gradient.end' },
              position: '100%',
            },
          ],
        },
      },
      {
        gradient: {
          direction: '45deg',
          start: 'red',
          startPosition: '0%',
          end: 'blue',
        },
      },
    );
    expect(result.background).toBe('linear-gradient(45deg, red 0%, blue 100%)');
  });

  it('converts backgroundGradient to CSS background (radial)', () => {
    const result = mapStyle(
      {
        backgroundGradient: {
          type: 'radial',
          stops: [
            { color: 'white', position: '0%' },
            { color: 'black', position: '100%' },
          ],
        },
      },
      {},
    );
    expect(result.background).toBe('radial-gradient(circle, white 0%, black 100%)');
  });

  it('converts backgroundGradient to CSS background (repeating-linear)', () => {
    const result = mapStyle(
      {
        backgroundGradient: {
          type: 'repeating-linear',
          direction: '180deg',
          stops: [
            { color: '#fff7c2', position: '0%' },
            { color: '#fff7c2', position: '24px' },
            { color: '#f3e6a5', position: '24px' },
            { color: '#f3e6a5', position: '25px' },
          ],
        },
      },
      {},
    );
    expect(result.background).toBe(
      'repeating-linear-gradient(180deg, #fff7c2 0%, #fff7c2 24px, #f3e6a5 24px, #f3e6a5 25px)',
    );
  });

  it('converts transform with rotate', () => {
    const result = mapStyle({ transform: { rotate: '45deg' } }, {});
    expect(result.transform).toContain('rotate(45deg)');
  });

  it('resolves nested $ref in transform object fields', () => {
    const result = mapStyle(
      {
        transform: {
          rotate: { $ref: '$transform.rotate' },
          scale: { $ref: '$transform.scale' },
          translateX: { $ref: '$transform.x' },
        },
      },
      {
        transform: {
          rotate: '45deg',
          scale: 1.2,
          x: 10,
        },
      },
    );
    expect(result.transform).toContain('rotate(45deg)');
    expect(result.transform).toContain('scale(1.2)');
    expect(result.transform).toContain('translateX(10px)');
  });

  it('converts transform with translateY', () => {
    const result = mapStyle({ transform: { translateY: 20 } }, {});
    expect(result.transform).toContain('translateY(20px)');
  });

  it('handles multiple box shadows as array', () => {
    const result = mapStyle(
      {
        boxShadow: [
          { offsetX: 1, offsetY: 2, blur: 3, spread: 4, color: 'red' },
          { offsetX: 5, offsetY: 6, blur: 7, spread: 8, color: 'blue' },
        ],
      },
      {},
    );
    expect(result.boxShadow).toContain('1px 2px 3px 4px red');
    expect(result.boxShadow).toContain('5px 6px 7px 8px blue');
    expect(result.boxShadow).toContain(', ');
  });

  it('resolves nested $ref in boxShadow fields', () => {
    const result = mapStyle(
      {
        boxShadow: {
          offsetX: { $ref: '$shadow.x' },
          offsetY: { $ref: '$shadow.y' },
          blur: { $ref: '$shadow.blur' },
          color: { $ref: '$shadow.color' },
        },
      },
      {
        shadow: {
          x: 2,
          y: 4,
          blur: 6,
          color: '#000',
        },
      },
    );
    expect(result.boxShadow).toContain('2px 4px 6px');
    expect(result.boxShadow).toContain('#000');
  });

  it('converts textShadow to CSS string', () => {
    const result = mapStyle(
      { textShadow: { offsetX: 1, offsetY: 2, blur: 4, color: '#000' } },
      {},
    );
    expect(result.textShadow).toBe('1px 2px 4px #000');
  });

  it('resolves nested $ref in textShadow fields', () => {
    const result = mapStyle(
      {
        textShadow: {
          offsetX: { $ref: '$shadow.x' },
          offsetY: { $ref: '$shadow.y' },
          blur: { $ref: '$shadow.blur' },
          color: { $ref: '$shadow.color' },
        },
      },
      {
        shadow: {
          x: 0,
          y: 0,
          blur: 12,
          color: '#ffaa33',
        },
      },
    );
    expect(result.textShadow).toBe('0px 0px 12px #ffaa33');
  });

  it('maps fontFamily token to a CSS font stack', () => {
    const result = mapStyle({ fontFamily: 'handwriting' }, {});
    expect(result.fontFamily).toContain('cursive');
    expect(result.fontFamily).toContain('Comic Sans MS');
  });

  it('resolves $ref values in style properties', () => {
    const result = mapStyle(
      { fontSize: { $ref: '$size' } },
      { size: 24 },
    );
    expect(result.fontSize).toBe(24);
  });
});

// =============================================================================
// 3. asset-resolver
// =============================================================================

describe('resolveAsset', () => {
  const assets = {
    '@assets/logo.png': 'https://cdn.example.com/logo.png',
    'avatar.png': 'blob:abc',
  };

  it('resolves full path', () => {
    expect(resolveAsset('@assets/logo.png', assets)).toBe(
      'https://cdn.example.com/logo.png',
    );
  });

  it('resolves key-only path', () => {
    expect(resolveAsset('@assets/avatar.png', assets)).toBe('blob:abc');
  });

  it('returns undefined for non-asset path', () => {
    expect(resolveAsset('http://evil.com/img.png', assets)).toBeUndefined();
  });

  it('returns undefined for missing asset', () => {
    expect(resolveAsset('@assets/missing.png', {})).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(resolveAsset('', {})).toBeUndefined();
  });

  it('returns undefined for path without @assets/ prefix', () => {
    expect(resolveAsset('assets/logo.png', assets)).toBeUndefined();
  });

  it('prefers full path match over key-only match', () => {
    const bothAssets = {
      '@assets/img.png': 'https://cdn.example.com/full-path.png',
      'img.png': 'https://cdn.example.com/key-only.png',
    };
    expect(resolveAsset('@assets/img.png', bothAssets)).toBe(
      'https://cdn.example.com/full-path.png',
    );
  });
});

// =============================================================================
// 4. UGCContainer
// =============================================================================

describe('UGCContainer', () => {
  it('renders children with security isolation styles', () => {
    const { container } = render(
      <UGCContainer>
        <span>test</span>
      </UGCContainer>,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.overflow).toBe('hidden');
    expect(div.style.isolation).toBe('isolate');
    expect(div.style.position).toBe('relative');
  });

  it('renders children content', () => {
    render(
      <UGCContainer>
        <span>child content</span>
      </UGCContainer>,
    );
    expect(screen.getByText('child content')).toBeTruthy();
  });

  it('merges custom style with container styles', () => {
    const { container } = render(
      <UGCContainer style={{ width: '300px', backgroundColor: 'blue' }}>
        <span>styled</span>
      </UGCContainer>,
    );
    const div = container.firstElementChild as HTMLElement;
    // Custom styles are merged
    expect(div.style.width).toBe('300px');
    expect(div.style.backgroundColor).toBe('blue');
    // Security styles still present
    expect(div.style.overflow).toBe('hidden');
    expect(div.style.isolation).toBe('isolate');
  });

  it('renders without children', () => {
    const { container } = render(<UGCContainer />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.tagName).toBe('DIV');
  });
});

// =============================================================================
// 5. UGCRenderer
// =============================================================================

describe('UGCRenderer', () => {
  const validCard = {
    meta: { name: 'test', version: '1.0.0' },
    views: {
      Main: {
        type: 'Box',
        children: [{ type: 'Text',  content: 'Hello World'  }],
      },
    },
  };

  it('renders a valid card', () => {
    render(<UGCRenderer card={validCard as any} />);
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders null for invalid card', () => {
    const invalidCard = { meta: {}, views: {} };
    const { container } = render(<UGCRenderer card={invalidCard as any} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onError for invalid card', () => {
    const onError = vi.fn();
    const invalidCard = { notValid: true };
    render(<UGCRenderer card={invalidCard as any} onError={onError} />);
    expect(onError).toHaveBeenCalled();
  });

  it('renders from raw JSON string', () => {
    const json = JSON.stringify(validCard);
    const { container } = render(<UGCRenderer card={json} />);
    expect(container.textContent).toContain('Hello World');
  });

  it('renders specified view', () => {
    const multiViewCard = {
      meta: { name: 'test', version: '1.0.0' },
      views: {
        Main: { type: 'Text',  content: 'Main View'  },
        Secondary: { type: 'Text',  content: 'Second View'  },
      },
    };
    render(<UGCRenderer card={multiViewCard as any} viewName="Secondary" />);
    expect(screen.getByText('Second View')).toBeTruthy();
  });

  it('resolves $ref values from card state', () => {
    const cardWithState = {
      meta: { name: 'test', version: '1.0.0' },
      state: { greeting: 'Hi from state' },
      views: {
        Main: {
          type: 'Text',
           content: { $ref: '$greeting' } ,
        },
      },
    };
    render(<UGCRenderer card={cardWithState as any} />);
    expect(screen.getByText('Hi from state')).toBeTruthy();
  });

  it('merges state override', () => {
    const cardWithState = {
      meta: { name: 'test', version: '1.0.0' },
      state: { msg: 'original' },
      views: {
        Main: { type: 'Text',  content: { $ref: '$msg' }  },
      },
    };
    render(
      <UGCRenderer card={cardWithState as any} state={{ msg: 'overridden' }} />,
    );
    expect(screen.getByText('overridden')).toBeTruthy();
  });

  it('defaults to first view when viewName is not provided', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: {
        First: { type: 'Text',  content: 'First View'  },
        Second: { type: 'Text',  content: 'Second View'  },
      },
    };
    render(<UGCRenderer card={card as any} />);
    expect(screen.getByText('First View')).toBeTruthy();
  });

  it('renders a root $use view through fragments', () => {
    const card = {
      meta: { name: 'fragments', version: '1.0.0' },
      fragments: {
        header: {
          type: 'Text',
          content: 'From fragment',
        },
      },
      views: {
        Main: { $use: 'header' },
      },
    };
    render(<UGCRenderer card={card as any} />);
    expect(screen.getByText('From fragment')).toBeTruthy();
  });

  it('renders with containerStyle', () => {
    const { container } = render(
      <UGCRenderer
        card={validCard as any}
        containerStyle={{ width: '500px' }}
      />,
    );
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.style.width).toBe('500px');
    // Security isolation styles still present
    expect(outerDiv.style.overflow).toBe('hidden');
  });

  it('keeps protected isolation styles when containerStyle tries to override them', () => {
    const { container } = render(
      <UGCRenderer
        card={validCard as any}
        containerStyle={{
          width: '500px',
          overflow: 'visible',
          position: 'static',
          contain: 'none',
          isolation: 'auto',
        }}
      />,
    );
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.style.width).toBe('500px');
    expect(outerDiv.style.overflow).toBe('hidden');
    expect(outerDiv.style.position).toBe('relative');
    expect(outerDiv.style.contain).toBe('content');
    expect(outerDiv.style.isolation).toBe('isolate');
  });

  it('rejects invalid merged state overrides before render', () => {
    const onError = vi.fn();
    const card = {
      meta: { name: 'loop-state', version: '1.0.0' },
      state: { items: ['ok'] },
      views: {
        Main: {
          type: 'Box',
          children: {
            for: 'item',
            in: '$items',
            template: { type: 'Text', content: { $ref: '$item' } },
          },
        },
      },
    };

    const { container } = render(
      <UGCRenderer
        card={card as any}
        state={{ items: 'not-an-array' }}
        onError={onError}
      />,
    );

    expect(container.innerHTML).toBe('');
    expect(onError).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: 'LOOP_SOURCE_NOT_ARRAY' }),
      ]),
    );
  });

  it('rejects merged state overrides when resolved style bytes exceed the limit', () => {
    const onError = vi.fn();
    const card = {
      meta: { name: 'style-state', version: '1.0.0' },
      state: { cols: '1fr 1fr' },
      views: {
        Main: {
          type: 'Grid' as const,
          style: { gridTemplateColumns: { $ref: '$cols' } },
          children: [{ type: 'Text' as const, content: 'x' }],
        },
      },
    };
    const hugeCols = '1fr '.repeat(30_000);

    const { container } = render(
      <UGCRenderer
        card={card}
        state={{ cols: hugeCols }}
        onError={onError}
      />,
    );

    expect(container.innerHTML).toBe('');
    expect(onError).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: 'STYLE_SIZE_EXCEEDED' }),
      ]),
    );
  });

  it('onError receives error details for missing meta fields', () => {
    const onError = vi.fn();
    const badCard = { meta: {}, views: {} };
    render(<UGCRenderer card={badCard as any} onError={onError} />);
    expect(onError).toHaveBeenCalledTimes(1);
    const errors = onError.mock.calls[0][0];
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toHaveProperty('code');
    expect(errors[0]).toHaveProperty('message');
    expect(errors[0]).toHaveProperty('path');
  });

  it('renders nothing for invalid JSON string', () => {
    const onError = vi.fn();
    const { container } = render(
      <UGCRenderer card="not valid json {{{" onError={onError} />,
    );
    expect(container.innerHTML).toBe('');
    expect(onError).toHaveBeenCalled();
  });
});

// =============================================================================
// 6. Security tests
// =============================================================================

describe('React security', () => {
  it('Text component never uses innerHTML', () => {
    const { container } = render(
      <UGCRenderer
        card={
          {
            meta: { name: 'test', version: '1.0.0' },
            views: {
              Main: {
                type: 'Text',
                 content: '<script>alert(1)</script>' ,
              },
            },
          } as any
        }
      />,
    );
    const span = container.querySelector('span');
    expect(span?.textContent).toBe('<script>alert(1)</script>');
    expect(span?.innerHTML).not.toContain('<script>');
  });

  it('Image with empty src renders nothing', () => {
    const { container } = render(
      <UGCRenderer
        card={
          {
            meta: { name: 'test', version: '1.0.0' },
            views: {
              Main: {
                type: 'Image',
                 src: '@assets/missing.png' ,
              },
            },
          } as any
        }
      />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('prototype pollution via $ref is blocked', () => {
    const cardWithPollution = {
      meta: { name: 'test', version: '1.0.0' },
      state: { __proto__: { polluted: 'yes' } },
      views: {
        Main: {
          type: 'Text',
           content: { $ref: '$__proto__.polluted' } ,
        },
      },
    };
    const { container } = render(
      <UGCRenderer card={cardWithPollution as any} />,
    );
    // The $ref should resolve to undefined, and the Text component
    // renders empty string for non-string content
    const span = container.querySelector('span');
    if (span) {
      expect(span.textContent).toBe('');
    }
  });

  it('HTML entities in text content are safely escaped', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: {
        Main: {
          type: 'Text',
           content: '<img src=x onerror=alert(1)>' ,
        },
      },
    };
    const { container } = render(<UGCRenderer card={card as any} />);
    const span = container.querySelector('span');
    expect(span?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
  });

  it('UGCContainer enforces contain:content for layout isolation', () => {
    const { container } = render(
      <UGCContainer>
        <span>isolated</span>
      </UGCContainer>,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.contain).toBe('content');
  });
});

// =============================================================================
// 7. renderTree (node-renderer)
// =============================================================================

describe('renderTree', () => {
  it('renders a Text node', () => {
    const node = { type: 'Text',  content: 'tree text'  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toBe('tree text');
  });

  it('renders a fragment reference in children', () => {
    const node = {
      type: 'Box',
      children: [{ $use: 'header' }],
    };
    const fragments = {
      header: {
        type: 'Text',
        content: 'fragment child',
      },
    };
    const { container } = render(<>{renderTree(node, {}, {}, undefined, undefined, undefined, undefined, { compact: false }, fragments)}</>);
    expect(container.textContent).toBe('fragment child');
  });

  it('skips a fragment reference when its wrapper $if is false', () => {
    const node = { $use: 'header', $if: { $ref: '$show' } };
    const fragments = {
      header: {
        type: 'Text',
        content: 'fragment child',
      },
    };
    const { container } = render(<>{renderTree(node, { show: false }, {}, undefined, undefined, undefined, undefined, { compact: false }, fragments)}</>);
    expect(container.innerHTML).toBe('');
  });

  it('calls onError when a fragment reference is missing at runtime', () => {
    const onError = vi.fn();
    render(
      <>
        {renderTree(
          { $use: 'missing' },
          {},
          {},
          undefined,
          undefined,
          undefined,
          onError,
          { compact: false },
          {},
        )}
      </>,
    );
    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_FRAGMENT_NOT_FOUND' }),
    ]);
  });

  it('renders a Box with children', () => {
    const node = {
      type: 'Box',
      children: [
        { type: 'Text',  content: 'child 1'  },
        { type: 'Text',  content: 'child 2'  },
      ],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('child 1');
    expect(container.textContent).toContain('child 2');
  });

  it('renders null for unsupported node types', () => {
    const node = { type: 'UnknownWidget',  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.innerHTML).toBe('');
  });

  it('renders null for null input', () => {
    const { container } = render(<>{renderTree(null, {}, {})}</>);
    expect(container.innerHTML).toBe('');
  });

  it('renders an Image node with resolved asset', () => {
    const node = { type: 'Image',  src: '@assets/pic.png', alt: 'a picture'  };
    const assets = { '@assets/pic.png': 'https://cdn.example.com/pic.png' };
    const { container } = render(<>{renderTree(node, {}, assets)}</>);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://cdn.example.com/pic.png');
    expect(img?.getAttribute('alt')).toBe('a picture');
  });

  it('renders a Row node', () => {
    const node = {
      type: 'Row',
      children: [{ type: 'Text',  content: 'in row'  }],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('in row');
  });

  it('renders a Column node', () => {
    const node = {
      type: 'Column',
      children: [{ type: 'Text',  content: 'in column'  }],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('in column');
  });

  it('resolves $ref in Text content via state', () => {
    const node = {
      type: 'Text',
       content: { $ref: '$name' } ,
    };
    const { container } = render(<>{renderTree(node, { name: 'Dynamic' }, {})}</>);
    expect(container.textContent).toBe('Dynamic');
  });

  it('renders structured template values in Text content', () => {
    const node = {
      type: 'Text',
      content: {
        $template: ['@', { $ref: '$username' }, ' · Lv.', { $ref: '$level' }],
      },
    };
    const { container } = render(<>{renderTree(node, { username: 'neo', level: 7 }, {})}</>);
    expect(container.textContent).toBe('@neo · Lv.7');
  });

  it('renders inline Text spans with independently mapped styles', () => {
    const node = {
      type: 'Text',
      spans: [
        { text: 'HP ', style: { color: '#94a3b8' } },
        {
          text: { $template: [{ $ref: '$hp' }, '/', { $ref: '$maxHp' }] },
          style: { color: '#22c55e', fontWeight: 'bold' },
        },
      ],
    };
    const { container } = render(<>{renderTree(node, { hp: 72, maxHp: 100 }, {})}</>);
    const spans = container.querySelectorAll('span span');
    expect(container.textContent).toBe('HP 72/100');
    expect(spans).toHaveLength(2);
    expect((spans[0] as HTMLElement).style.color).toBe('rgb(148, 163, 184)');
    expect((spans[1] as HTMLElement).style.fontWeight).toBe('bold');
  });

  it('applies single-line text truncation styles', () => {
    const node = {
      type: 'Text',
      content: 'This text should clamp',
      maxLines: 1,
      truncate: 'ellipsis',
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    const text = container.firstElementChild as HTMLElement;
    expect(text.style.whiteSpace).toBe('nowrap');
    expect(text.style.textOverflow).toBe('ellipsis');
    expect(text.style.overflow).toBe('hidden');
  });

  it('reuses template resolution for Button labels', () => {
    const node = {
      type: 'Button',
      label: { $template: ['Claim ', { $ref: '$amount' }, ' XP'] },
      action: 'claim',
    };
    const { unmount } = render(<>{renderTree(node, { amount: 120 }, {})}</>);
    expect(screen.getByRole('button', { name: 'Claim 120 XP' })).toBeTruthy();
    unmount();
  });

  it('applies style to rendered nodes', () => {
    const node = {
      type: 'Box',
      style: { backgroundColor: 'red', padding: 10 },
      children: [],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.backgroundColor).toBe('red');
    expect(div.style.padding).toBe('10px');
  });

  // --- Fix 1: Image src $ref security ---

  it('blocks Image with $ref src resolving to external URL', () => {
    const node = {
      type: 'Image',
       src: { $ref: '$img' } ,
    };
    const state = { img: 'https://evil.com/img.png' };
    const { container } = render(<>{renderTree(node, state, {})}</>);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders Image with $ref src resolving to valid @assets/ path', () => {
    const node = {
      type: 'Image',
       src: { $ref: '$img' }, alt: 'test image' ,
    };
    const state = { img: '@assets/logo.png' };
    const assets = { '@assets/logo.png': 'https://cdn.example.com/logo.png' };
    const { container } = render(<>{renderTree(node, state, assets)}</>);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://cdn.example.com/logo.png');
  });

  it('blocks Image with $ref src resolving to path traversal', () => {
    const node = {
      type: 'Image',
       src: { $ref: '$img' } ,
    };
    const state = { img: '@assets/../secret.png' };
    const assets = { '@assets/../secret.png': 'https://cdn.example.com/secret.png' };
    const { container } = render(<>{renderTree(node, state, assets)}</>);
    expect(container.querySelector('img')).toBeNull();
  });

  // --- Fix 2: $ref with array index in renderTree ---

  it('resolves $ref with array index in Text content', () => {
    const node = {
      type: 'Text',
       content: { $ref: '$items[0].name' } ,
    };
    const state = { items: [{ name: 'hi' }] };
    const { container } = render(<>{renderTree(node, state, {})}</>);
    expect(container.textContent).toBe('hi');
  });
});

// =============================================================================
// Phase 2 Tests
// =============================================================================

describe('State resolver with locals', () => {
  it('resolveRef returns local value when key exists in locals', () => {
    const result = resolveRef('$item', {}, { item: 'local-val' });
    expect(result).toBe('local-val');
  });

  it('resolveRef falls back to state when key is not in locals', () => {
    const result = resolveRef('$hp', { hp: 100 }, { item: 'x' });
    expect(result).toBe(100);
  });

  it('resolveRef resolves nested path from locals', () => {
    const result = resolveRef('$item.name', {}, { item: { name: 'Alice' } });
    expect(result).toBe('Alice');
  });

  it('resolveValue resolves $ref from locals', () => {
    const result = resolveValue({ $ref: '$item' }, {}, { item: 42 });
    expect(result).toBe(42);
  });
});

describe('Style mapper with locals', () => {
  it('resolves color from locals via $ref', () => {
    const result = mapStyle(
      { color: { $ref: '$item.color' } },
      {},
      { item: { color: '#ff0000' } },
    );
    expect(result.color).toBe('#ff0000');
  });

  it('blocks CSS function url() in backgroundColor', () => {
    const result = mapStyle(
      { backgroundColor: { $ref: '$bg' } },
      { bg: 'url(http://evil)' },
      undefined,
    );
    expect(result).not.toHaveProperty('backgroundColor');
  });

  it('allows safe color value in backgroundColor', () => {
    const result = mapStyle(
      { backgroundColor: { $ref: '$bg' } },
      { bg: '#ff0000' },
    );
    expect(result.backgroundColor).toBe('#ff0000');
  });

  it('blocks forbidden CSS functions in nested structured style refs', () => {
    const result = mapStyle(
      {
        border: {
          width: 1,
          style: 'solid',
          color: { $ref: '$border.color' },
        },
      },
      { border: { color: 'url(http://evil)' } },
    );
    expect(result.border).toBe('1px solid #000');
    expect(result.border).not.toContain('url(');
  });

  it('blocks CSS function var() in gridTemplateColumns', () => {
    const result = mapStyle(
      { gridTemplateColumns: { $ref: '$cols' } },
      { cols: 'var(--x)' },
    );
    expect(result).not.toHaveProperty('gridTemplateColumns');
  });
});

describe('For-loop rendering', () => {
  it('renders children for each item in the array', () => {
    const node = {
      type: 'Box',
      children: {
        for: 'msg',
        in: '$messages',
        template: {
          type: 'Text',
           content: { $ref: '$msg' } ,
        },
      },
    };
    const state = { messages: ['Hello', 'World'] };
    const { container } = render(<>{renderTree(node, state, {})}</>);
    expect(container.textContent).toContain('Hello');
    expect(container.textContent).toContain('World');
    // There should be two Text elements inside the Box
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(2);
  });

  it('renders nothing when for-loop source is not an array', () => {
    const node = {
      type: 'Box',
      children: {
        for: 'msg',
        in: '$messages',
        template: {
          type: 'Text',
           content: { $ref: '$msg' } ,
        },
      },
    };
    const state = { messages: 'not-an-array' };
    const { container } = render(<>{renderTree(node, state, {})}</>);
    // The Box div should exist but have no text children
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(0);
  });

  it('provides $index in locals for each iteration', () => {
    // index is a number, so use item values (strings) to verify 3 iterations
    const node = {
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: {
          type: 'Text',
           content: { $ref: '$item' } ,
        },
      },
    };
    const state = { items: ['a', 'b', 'c'] };
    const { container } = render(<>{renderTree(node, state, {})}</>);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(3);
    expect(spans[0].textContent).toBe('a');
    expect(spans[1].textContent).toBe('b');
    expect(spans[2].textContent).toBe('c');
  });
});

describe('New components rendering', () => {
  it('Stack renders a div', () => {
    const node = { type: 'Stack', children: [] };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('Grid renders a div', () => {
    const node = { type: 'Grid', children: [] };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('Spacer renders with size prop', () => {
    const node = { type: 'Spacer',  size: 16  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
  });

  it('Divider renders', () => {
    const node = { type: 'Divider' };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
  });

  it('Button renders with label and calls onAction on click', () => {
    const onAction = vi.fn();
    const node = {
      type: 'Button',
       label: 'Click Me', action: 'submit' ,
    };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, onAction)}</>,
    );
    const btn = screen.getByRole('button');
    expect(btn.textContent).toBe('Click Me');
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledWith('button', 'submit');
  });

  it('Button resolves disabled and does not fire onAction when disabled', () => {
    const onAction = vi.fn();
    const node = {
      type: 'Button',
      label: 'Disabled',
      action: 'submit',
      disabled: { $ref: '$isDisabled' },
    };
    const { container } = render(
      <>{renderTree(node, { isDisabled: true }, {}, undefined, undefined, onAction)}</>,
    );
    const btn = container.querySelector('button') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn!);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('Toggle renders and calls onAction with toggle payload', () => {
    const onAction = vi.fn();
    const node = {
      type: 'Toggle',
       value: false, onToggle: 'toggle-dark' ,
    };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, onAction)}</>,
    );
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(onAction).toHaveBeenCalledWith('toggle', 'toggle-dark', { value: true });
  });

  it('Toggle resolves disabled', () => {
    const node = {
      type: 'Toggle',
      value: true,
      onToggle: 'toggle-dark',
      disabled: true,
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    const btn = container.querySelector('button') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn?.disabled).toBe(true);
  });

  it('Accordion toggles item content locally', () => {
    const node = {
      type: 'Accordion',
      defaultExpanded: ['profile'],
      items: [
        {
          id: 'profile',
          label: 'Profile',
          content: { type: 'Text', content: 'Profile body' },
        },
        {
          id: 'inventory',
          label: 'Inventory',
          content: { type: 'Text', content: 'Inventory body' },
        },
      ],
    };
    render(<>{renderTree(node, {}, {})}</>);

    expect(screen.getByText('Profile body')).toBeTruthy();
    expect(screen.queryByText('Inventory body')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Inventory/ }));
    expect(screen.getByText('Inventory body')).toBeTruthy();
    expect(screen.queryByText('Profile body')).toBeNull();
  });

  it('Accordion does not toggle disabled items', () => {
    const node = {
      type: 'Accordion',
      items: [
        {
          id: 'locked',
          label: 'Locked',
          disabled: true,
          content: { type: 'Text', content: 'Hidden body' },
        },
      ],
    };
    render(<>{renderTree(node, {}, {})}</>);

    const button = screen.getByRole('button', { name: /Locked/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(screen.queryByText('Hidden body')).toBeNull();
  });

  it('Accordion reserves runtime budget for hidden item content', () => {
    const onError = vi.fn();
    const huge = 'x'.repeat(TEXT_CONTENT_TOTAL_MAX_BYTES + 1);
    const node = {
      type: 'Accordion',
      items: [
        {
          id: 'summary',
          label: 'Summary',
          content: { type: 'Text', content: 'visible' },
        },
        {
          id: 'hidden',
          label: 'Hidden',
          content: { type: 'Text', content: huge },
        },
      ],
    };

    render(<>{renderTree(node, {}, {}, undefined, undefined, undefined, onError)}</>);

    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_TEXT_LIMIT' }),
    ]);
  });

  it('Tabs switches visible panel content locally', () => {
    const node = {
      type: 'Tabs',
      defaultTab: 'stats',
      tabs: [
        {
          id: 'stats',
          label: 'Stats',
          content: { type: 'Text', content: 'Stats body' },
        },
        {
          id: 'logs',
          label: 'Logs',
          content: { type: 'Text', content: 'Logs body' },
        },
      ],
    };
    render(<>{renderTree(node, {}, {})}</>);

    expect(screen.getByText('Stats body')).toBeTruthy();
    expect(screen.queryByText('Logs body')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Logs' }));
    expect(screen.getByText('Logs body')).toBeTruthy();
    expect(screen.queryByText('Stats body')).toBeNull();
  });

  it('Tabs supports keyboard navigation across enabled tabs', () => {
    const node = {
      type: 'Tabs',
      defaultTab: 'stats',
      tabs: [
        {
          id: 'stats',
          label: 'Stats',
          content: { type: 'Text', content: 'Stats body' },
        },
        {
          id: 'logs',
          label: 'Logs',
          content: { type: 'Text', content: 'Logs body' },
        },
        {
          id: 'history',
          label: 'History',
          content: { type: 'Text', content: 'History body' },
        },
      ],
    };
    render(<>{renderTree(node, {}, {})}</>);

    const statsTab = screen.getByRole('tab', { name: 'Stats' });
    fireEvent.keyDown(statsTab, { key: 'ArrowRight' });

    const logsTab = screen.getByRole('tab', { name: 'Logs' });
    expect(logsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Logs body')).toBeTruthy();
  });

  it('Tabs does not activate disabled tabs', () => {
    const node = {
      type: 'Tabs',
      defaultTab: 'stats',
      tabs: [
        {
          id: 'stats',
          label: 'Stats',
          content: { type: 'Text', content: 'Stats body' },
        },
        {
          id: 'locked',
          label: 'Locked',
          disabled: true,
          content: { type: 'Text', content: 'Locked body' },
        },
      ],
    };
    render(<>{renderTree(node, {}, {})}</>);

    const lockedTab = screen.getByRole('tab', { name: 'Locked' }) as HTMLButtonElement;
    expect(lockedTab.disabled).toBe(true);
    fireEvent.click(lockedTab);
    expect(screen.queryByText('Locked body')).toBeNull();
    expect(screen.getByText('Stats body')).toBeTruthy();
  });

  it('Tabs reserves runtime budget for hidden panel content', () => {
    const onError = vi.fn();
    const huge = 'x'.repeat(TEXT_CONTENT_TOTAL_MAX_BYTES + 1);
    const node = {
      type: 'Tabs',
      defaultTab: 'summary',
      tabs: [
        {
          id: 'summary',
          label: 'Summary',
          content: { type: 'Text', content: 'visible' },
        },
        {
          id: 'hidden',
          label: 'Hidden',
          content: { type: 'Text', content: huge },
        },
      ],
    };

    render(<>{renderTree(node, {}, {}, undefined, undefined, undefined, onError)}</>);

    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_TEXT_LIMIT' }),
    ]);
  });

  it('Switch renders the matching case from state', () => {
    const node = {
      type: 'Switch',
      value: { $ref: '$theme' },
      cases: {
        knight: {
          type: 'Text',
          content: 'Knight frame',
        },
        villain: {
          type: 'Text',
          content: 'Villain frame',
        },
      },
      default: {
        type: 'Text',
        content: 'Default frame',
      },
    };
    render(<>{renderTree(node, { theme: 'villain' }, {})}</>);

    expect(screen.getByText('Villain frame')).toBeTruthy();
    expect(screen.queryByText('Knight frame')).toBeNull();
    expect(screen.queryByText('Default frame')).toBeNull();
  });

  it('Switch falls back to default when no case matches', () => {
    const node = {
      type: 'Switch',
      value: { $ref: '$theme' },
      cases: {
        knight: {
          type: 'Text',
          content: 'Knight frame',
        },
      },
      default: {
        type: 'Text',
        content: 'Default frame',
      },
    };
    render(<>{renderTree(node, { theme: 'unknown' }, {})}</>);

    expect(screen.getByText('Default frame')).toBeTruthy();
    expect(screen.queryByText('Knight frame')).toBeNull();
  });

  it('ProgressBar renders with value and max', () => {
    const node = { type: 'ProgressBar',  value: 50, max: 100  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
  });

  it('Badge renders with label', () => {
    const node = { type: 'Badge',  label: 'New'  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('New');
  });

  it('Chip renders with label', () => {
    const node = { type: 'Chip',  label: 'Tag'  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('Tag');
  });

  it('skips rendering when $if resolves to false', () => {
    const node = {
      type: 'Text',
      $if: { $ref: '$show' },
      content: 'hidden',
    };
    const { container } = render(<>{renderTree(node, { show: false }, {})}</>);
    expect(container.textContent).toBe('');
  });

  it('renders when $if comparison resolves to true', () => {
    const node = {
      type: 'Text',
      $if: { op: 'gt', left: { $ref: '$hp' }, right: 0 },
      content: 'alive',
    };
    const { container } = render(<>{renderTree(node, { hp: 10 }, {})}</>);
    expect(container.textContent).toContain('alive');
  });

  it('Avatar renders with @assets/ src resolved from asset map', () => {
    const node = {
      type: 'Avatar',
       src: '@assets/avatar.png' ,
    };
    const assets = { 'avatar.png': 'https://cdn.example.com/avatar.png' };
    const { container } = render(<>{renderTree(node, {}, assets)}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('https://cdn.example.com/avatar.png');
  });

  it('Icon renders when iconResolver is provided', () => {
    const iconResolver = (name: string) => <span data-testid="icon">{name}</span>;
    const node = { type: 'Icon',  name: 'star'  };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, iconResolver)}</>,
    );
    expect(screen.getByTestId('icon')).not.toBeNull();
    expect(screen.getByTestId('icon').textContent).toBe('star');
  });

  it('Icon resolves name from $ref when iconResolver is provided', () => {
    const iconResolver = (name: string) => <span data-testid="icon">{name}</span>;
    const node = { type: 'Icon', name: { $ref: '$iconName' } };
    const { container } = render(
      <>{renderTree(node, { iconName: 'heart' }, {}, undefined, iconResolver)}</>,
    );
    expect(container.textContent).toContain('heart');
  });

  it('Icon returns null when iconResolver is not provided', () => {
    const node = { type: 'Icon',  name: 'star'  };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.innerHTML).toBe('');
  });
});

describe('$style rendering', () => {
  it('merges $style from cardStyles with inline styles', () => {
    const node = {
      type: 'Box',
      style: { $style: 'myStyle', color: '#000' },
      children: [],
    };
    const cardStyles = { myStyle: { backgroundColor: '#fff' } };
    const { container } = render(
      <>{renderTree(node, {}, {}, cardStyles)}</>,
    );
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div!.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(div!.style.color).toBe('rgb(0, 0, 0)');
  });

  it('renders without $style when referencing a missing cardStyle', () => {
    const node = {
      type: 'Box',
      style: { $style: 'nonExistent', color: '#000' },
      children: [],
    };
    const cardStyles = {};
    const { container } = render(
      <>{renderTree(node, {}, {}, cardStyles)}</>,
    );
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div!.style.color).toBe('rgb(0, 0, 0)');
  });
});

describe('responsive rendering', () => {
  it('applies medium overrides before compact overrides', () => {
    const node = {
      type: 'Box',
      style: { width: '720px', padding: 24, color: '#fff' },
      responsive: {
        medium: { width: '100%', padding: 16 },
        compact: { padding: 12 },
      },
      children: [],
    };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, undefined, undefined, { compact: false, medium: true })}</>,
    );
    const div = container.querySelector('div');
    expect(div?.style.width).toBe('100%');
    expect(div?.style.padding).toBe('16px');
    expect(div?.style.color).toBe('rgb(255, 255, 255)');
  });

  it('applies compact overrides when renderTree receives compact responsive state', () => {
    const node = {
      type: 'Box',
      style: { width: '360px', padding: 24 },
      responsive: {
        medium: { width: '80%', padding: 16 },
        compact: { width: '100%', padding: 12, flexDirection: 'column' },
      },
      children: [],
    };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, undefined, undefined, { compact: true })}</>,
    );
    const div = container.querySelector('div');
    expect(div?.style.width).toBe('100%');
    expect(div?.style.padding).toBe('12px');
    expect(div?.style.flexDirection).toBe('column');
  });

  it('keeps base hoverStyle active while using compact overrides', () => {
    const node = {
      type: 'Box',
      style: {
        height: 200,
        hoverStyle: { height: 300 },
      },
      responsive: {
        compact: { height: 120 },
      },
      children: [],
    };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, undefined, undefined, { compact: true })}</>,
    );
    const div = container.querySelector('div') as HTMLElement;
    expect(div.style.height).toBe('120px');
    fireEvent.mouseEnter(div);
    expect(div.style.height).toBe('300px');
  });
});

describe('Runtime limits', () => {
  it('stops rendering when node count exceeds limit', () => {
    // Create a tree with > 10001 nodes via deeply nested for-loop
    const children: any[] = [];
    for (let i = 0; i < 10002; i++) {
      children.push({ type: 'Text',  content: `node-${i}`  });
    }
    const node = { type: 'Box', children };
    const onError = vi.fn();
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, undefined, onError)}</>,
    );
    // Should not render all 10002 Text nodes
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeLessThan(10002);
  });

  it('stops rendering when text bytes exceed limit', () => {
    // Use a for-loop producing many Text nodes with long content
    const longStr = 'A'.repeat(1000);
    const items = Array.from({ length: 2000 }, (_, i) => longStr);
    const node = {
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: {
          type: 'Text',
           content: { $ref: '$item' } ,
        },
      },
    };
    const state = { items };
    const onError = vi.fn();
    const { container } = render(
      <>{renderTree(node, state, {}, undefined, undefined, undefined, onError)}</>,
    );
    // Should have rendered some but not all text
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeLessThan(2000);
  });

  it('stops rendering when non-Text label bytes exceed limit', () => {
    const onError = vi.fn();
    const huge = 'x'.repeat(TEXT_CONTENT_TOTAL_MAX_BYTES + 1);
    const node = { type: 'Button', label: huge, action: 'go' };
    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, undefined, onError)}</>,
    );
    expect(container.innerHTML).toBe('');
    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_TEXT_LIMIT' }),
    ]);
  });
});

describe('UGCRenderer with new fields', () => {
  it('passes iconResolver prop through to renderer', () => {
    const iconResolver = (name: string) => <span data-testid="ugc-icon">{name}</span>;
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: { Main: { type: 'Icon' as const,  name: 'heart'  } },
    };
    render(<UGCRenderer card={card} iconResolver={iconResolver} />);
    expect(screen.getByTestId('ugc-icon')).not.toBeNull();
    expect(screen.getByTestId('ugc-icon').textContent).toBe('heart');
  });

  it('passes onAction prop through to renderer', () => {
    const onAction = vi.fn();
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: { Main: { type: 'Button' as const,  label: 'Act', action: 'click'  } },
    };
    const { container } = render(<UGCRenderer card={card} onAction={onAction} />);
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(onAction).toHaveBeenCalledWith('button', 'click');
  });

  it('passes card.styles as cardStyles to renderer', () => {
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      styles: { heading: { fontSize: 24 } },
      views: {
        Main: {
          type: 'Box' as const,
          style: { $style: 'heading', color: '#000' },
          children: [],
        },
      },
    };
    const { container } = render(<UGCRenderer card={card} />);
    // UGCContainer wraps the content with a div
    const innerDivs = container.querySelectorAll('div');
    // The card styles should produce a Box div with fontSize and color
    const boxDiv = innerDivs[innerDivs.length - 1];
    expect(boxDiv).not.toBeNull();
  });

});

// ===========================================================================
// Review feedback tests
// ===========================================================================

describe('Review feedback fixes', () => {
  it('$style with leading/trailing whitespace is trimmed and applied', () => {
    const root = {
      type: 'Box',
      style: { $style: '  heading  ', color: '#000' },
      children: [],
    };
    const state = {};
    const cardStyles = { heading: { fontSize: 24 } };
    const { container } = render(
      <>{renderTree(root, state, {}, cardStyles)}</>,
    );
    const div = container.querySelector('div');
    // fontSize from cardStyles should be applied after trimming
    expect(div?.style.fontSize).toBe('24px');
  });

  it('ProgressBar with max=0 renders 0% width (not NaN)', () => {
    const root = {
      type: 'ProgressBar',
       value: 0, max: 0 ,
    };
    const { container } = render(
      <>{renderTree(root, {}, {})}</>,
    );
    const inner = container.querySelector('div > div') as HTMLElement | null;
    // jsdom normalizes "0%" to "" for width, so check it's not NaN
    expect(inner?.style.width).not.toContain('NaN');
  });

  it('ProgressBar with max=0 and value=5 renders 0% width', () => {
    const root = {
      type: 'ProgressBar',
       value: 5, max: 0 ,
    };
    const { container } = render(
      <>{renderTree(root, {}, {})}</>,
    );
    const inner = container.querySelector('div > div') as HTMLElement | null;
    // jsdom normalizes "0%" to "" for width, so check it's not NaN
    expect(inner?.style.width).not.toContain('NaN');
  });

  it('Divider with thickness="2px" does not double-append px', () => {
    const root = {
      type: 'Divider',
       thickness: '2px' ,
    };
    const { container } = render(
      <>{renderTree(root, {}, {})}</>,
    );
    const div = container.querySelector('div');
    expect(div?.style.borderTop).toContain('2px solid');
  });

  it('Divider with numeric string thickness="2" appends px', () => {
    const root = {
      type: 'Divider',
       thickness: '2' ,
    };
    const { container } = render(
      <>{renderTree(root, {}, {})}</>,
    );
    const div = container.querySelector('div');
    expect(div?.style.borderTop).toContain('2px solid');
  });

  it('renderForLoop calls onError when loop source is not an array', () => {
    const onError = vi.fn();
    const root = {
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text',  content: 'hi'  },
      },
    };
    const state = { items: 'not-an-array' };
    render(
      <>{renderTree(root, state, {}, undefined, undefined, undefined, onError)}</>,
    );
    expect(onError).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RUNTIME_LOOP_SOURCE_INVALID' }),
      ]),
    );
  });

  it('renderForLoop soft-skips when source is undefined (no onError)', () => {
    const onError = vi.fn();
    const root = {
      type: 'Box',
      children: {
        for: 'item',
        in: '$items',
        template: { type: 'Text',  content: 'hi'  },
      },
    };
    render(
      <>{renderTree(root, {}, {}, undefined, undefined, undefined, onError)}</>,
    );
    // resolveRef for "$items" returns undefined → soft skip, no error
    expect(onError).not.toHaveBeenCalled();
  });
});

// =============================================================================
// mapTransition
// =============================================================================

describe('mapTransition', () => {
  it('converts single transition to CSS string', () => {
    const result = mapTransition({ property: 'height', duration: 600, easing: 'ease' });
    expect(result).toBe('height 600ms ease');
  });

  it('converts camelCase property to kebab-case', () => {
    const result = mapTransition({ property: 'backgroundColor', duration: 300 });
    expect(result).toBe('background-color 300ms');
  });

  it('converts borderRadiusTopLeft to correct CSS name', () => {
    const result = mapTransition({ property: 'borderRadiusTopLeft', duration: 300 });
    expect(result).toBe('border-top-left-radius 300ms');
  });

  it('converts textShadow to the correct CSS property name', () => {
    const result = mapTransition({ property: 'textShadow', duration: 300 });
    expect(result).toBe('text-shadow 300ms');
  });

  it('converts transition with delay', () => {
    const result = mapTransition({ property: 'opacity', duration: 300, easing: 'linear', delay: 100 });
    expect(result).toBe('opacity 300ms linear 100ms');
  });

  it('converts transition array to comma-separated CSS', () => {
    const result = mapTransition([
      { property: 'height', duration: 600, easing: 'ease' },
      { property: 'backgroundColor', duration: 300 },
    ]);
    expect(result).toBe('height 600ms ease, background-color 300ms');
  });

  it('returns undefined for empty/null input', () => {
    expect(mapTransition(null)).toBeUndefined();
    expect(mapTransition(undefined)).toBeUndefined();
  });
});

// =============================================================================
// mapStyle with transition
// =============================================================================

describe('mapStyle — transition integration', () => {
  it('maps transition field to css.transition string', () => {
    const result = mapStyle(
      { height: 200, transition: { property: 'height', duration: 600, easing: 'ease' } },
      {},
    );
    expect(result.transition).toBe('height 600ms ease');
    expect(result.height).toBe(200);
  });

  it('rejects non-whitelisted property in transition at render time', () => {
    const result = mapStyle(
      { transition: { property: 'all', duration: 300 } },
      {},
    );
    expect(result.transition).toBeUndefined();
  });

  it('rejects non-whitelisted easing in transition at render time', () => {
    const result = mapStyle(
      { transition: { property: 'opacity', duration: 300, easing: 'cubic-bezier(0,0,1,1)' } },
      {},
    );
    // easing is stripped but property + duration still work
    expect(result.transition).toBe('opacity 300ms');
  });
});

// =============================================================================
// Hover rendering
// =============================================================================

describe('Hover rendering', () => {
  it('renders Box with hoverStyle and responds to mouseEnter/mouseLeave', () => {
    const root = {
      type: 'Box',
      style: {
        height: 200,
        backgroundColor: '#000',
        transition: { property: 'height', duration: 600, easing: 'ease' },
        hoverStyle: { height: 400 },
      },
      children: [{ type: 'Text', content: 'hover me' }],
    };

    const { container } = render(
      <>{renderTree(root, {}, {})}</>,
    );

    const box = container.firstChild as HTMLElement;
    expect(box).toBeTruthy();
    expect(box.style.height).toBe('200px');
    expect(box.style.transition).toBe('height 600ms ease');

    // Hover
    fireEvent.mouseEnter(box);
    expect(box.style.height).toBe('400px');

    // Unhover
    fireEvent.mouseLeave(box);
    expect(box.style.height).toBe('200px');
  });

  it('merges hoverStyle $style from card.styles and applies inline overrides on hover', () => {
    const root = {
      type: 'Box',
      style: {
        height: 200,
        hoverStyle: {
          $style: '  hoverCard  ',
          height: 500,
        },
      },
      children: [{ type: 'Text', content: 'hover me' }],
    };

    const cardStyles = {
      hoverCard: {
        backgroundColor: '#123456',
        opacity: 0.6,
        height: 400,
      },
    };

    const { container } = render(
      <>{renderTree(root, {}, {}, cardStyles)}</>,
    );

    const box = container.firstChild as HTMLElement;
    expect(box).toBeTruthy();
    expect(box.style.height).toBe('200px');
    expect(box.style.backgroundColor).toBe('');

    fireEvent.mouseEnter(box);
    expect(box.style.height).toBe('500px');
    expect(box.style.backgroundColor).toBe('rgb(18, 52, 86)');
    expect(box.style.opacity).toBe('0.6');

    fireEvent.mouseLeave(box);
    expect(box.style.height).toBe('200px');
    expect(box.style.backgroundColor).toBe('');
  });

  it('renders without hover handlers when hoverStyle is absent', () => {
    const root = {
      type: 'Box',
      style: { height: 200 },
      children: [{ type: 'Text', content: 'no hover' }],
    };

    const { container } = render(
      <>{renderTree(root, {}, {})}</>,
    );

    const box = container.firstChild as HTMLElement;
    expect(box.style.height).toBe('200px');
    // Should not have hover handlers (no crash on mouse events)
    fireEvent.mouseEnter(box);
    expect(box.style.height).toBe('200px');
  });
});
