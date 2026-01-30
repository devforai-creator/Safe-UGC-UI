import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { resolveRef, resolveValue } from './state-resolver.js';
import { mapStyle } from './style-mapper.js';
import { resolveAsset } from './asset-resolver.js';
import { renderTree } from './node-renderer.js';
import { UGCContainer } from './UGCContainer.js';
import { UGCRenderer } from './UGCRenderer.js';

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

  it('returns undefined for $expr (Phase 2)', () => {
    expect(resolveValue({ $expr: '$hp + 10' }, { hp: 50 })).toBeUndefined();
  });

  it('returns undefined as-is', () => {
    expect(resolveValue(undefined, {})).toBeUndefined();
  });

  it('returns boolean literals as-is', () => {
    expect(resolveValue(true, {})).toBe(true);
    expect(resolveValue(false, {})).toBe(false);
  });

  it('returns plain objects without $ref or $expr as-is', () => {
    const obj = { foo: 'bar' };
    expect(resolveValue(obj, {})).toBe(obj);
  });

  it('resolves nested $ref through state', () => {
    expect(resolveValue({ $ref: '$user.name' }, { user: { name: 'Bob' } })).toBe('Bob');
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

  it('converts transform with rotate', () => {
    const result = mapStyle({ transform: { rotate: '45deg' } }, {});
    expect(result.transform).toContain('rotate(45deg)');
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
        children: [{ type: 'Text', props: { content: 'Hello World' } }],
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
        Main: { type: 'Text', props: { content: 'Main View' } },
        Secondary: { type: 'Text', props: { content: 'Second View' } },
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
          props: { content: { $ref: '$greeting' } },
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
        Main: { type: 'Text', props: { content: { $ref: '$msg' } } },
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
        First: { type: 'Text', props: { content: 'First View' } },
        Second: { type: 'Text', props: { content: 'Second View' } },
      },
    };
    render(<UGCRenderer card={card as any} />);
    expect(screen.getByText('First View')).toBeTruthy();
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
                props: { content: '<script>alert(1)</script>' },
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
                props: { src: '@assets/missing.png' },
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
          props: { content: { $ref: '$__proto__.polluted' } },
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
          props: { content: '<img src=x onerror=alert(1)>' },
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
    const node = { type: 'Text', props: { content: 'tree text' } };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toBe('tree text');
  });

  it('renders a Box with children', () => {
    const node = {
      type: 'Box',
      children: [
        { type: 'Text', props: { content: 'child 1' } },
        { type: 'Text', props: { content: 'child 2' } },
      ],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('child 1');
    expect(container.textContent).toContain('child 2');
  });

  it('renders null for unsupported node types', () => {
    const node = { type: 'UnknownWidget', props: {} };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.innerHTML).toBe('');
  });

  it('renders null for null input', () => {
    const { container } = render(<>{renderTree(null, {}, {})}</>);
    expect(container.innerHTML).toBe('');
  });

  it('renders an Image node with resolved asset', () => {
    const node = { type: 'Image', props: { src: '@assets/pic.png', alt: 'a picture' } };
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
      children: [{ type: 'Text', props: { content: 'in row' } }],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('in row');
  });

  it('renders a Column node', () => {
    const node = {
      type: 'Column',
      children: [{ type: 'Text', props: { content: 'in column' } }],
    };
    const { container } = render(<>{renderTree(node, {}, {})}</>);
    expect(container.textContent).toContain('in column');
  });

  it('resolves $ref in Text content via state', () => {
    const node = {
      type: 'Text',
      props: { content: { $ref: '$name' } },
    };
    const { container } = render(<>{renderTree(node, { name: 'Dynamic' }, {})}</>);
    expect(container.textContent).toBe('Dynamic');
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
});
