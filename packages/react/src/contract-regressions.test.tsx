import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { STYLE_OBJECTS_TOTAL_MAX_BYTES } from '@safe-ugc-ui/types';
import { getEffectiveStyleForMode } from '@safe-ugc-ui/types/internal/style-semantics';
import { UGCRenderer } from './UGCRenderer.js';
import { renderNode, renderTree, type RenderContext } from './node-renderer.js';
import { mapStyle } from './style-mapper.js';
import { Accordion } from './components/Accordion.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function jsonUtf8Bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function makeRenderContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    state: {},
    assets: {},
    limits: {
      nodeCount: 0,
      textBytes: 0,
      styleBytes: 0,
      overflowAutoCount: 0,
    },
    responsive: {
      compact: false,
      medium: false,
    },
    ...overrides,
  };
}

describe('contract regressions — react renderer', () => {
  it('emits onError when an asset mapping is missing at runtime', () => {
    const node = { type: 'Image', src: '@assets/missing.png' } as const;
    const onError = vi.fn();

    const { container } = render(
      <>{renderTree(node, {}, {}, undefined, undefined, undefined, onError)}</>,
    );

    expect(container.firstChild).toBeNull();
    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_ASSET_NOT_FOUND' }),
    ]);
  });

  it('reports invalid viewName through onError and renders null', async () => {
    const onError = vi.fn();
    const multiViewCard = {
      meta: { name: 'test', version: '1.0.0' },
      views: {
        Main: { type: 'Text', content: 'Main View' },
        Secondary: { type: 'Text', content: 'Second View' },
      },
    };

    const { container } = render(
      <UGCRenderer card={multiViewCard as any} viewName="Missing" onError={onError} />,
    );

    expect(container.innerHTML).toBe('');

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith([
        expect.objectContaining({ code: 'RUNTIME_VIEW_NOT_FOUND', path: 'viewName' }),
      ]);
    });
  });

  it('reports missing iconResolver and soft-skips Icon nodes', () => {
    const onError = vi.fn();
    const card = {
      meta: { name: 'test', version: '1.0.0' },
      views: { Main: { type: 'Icon' as const, name: 'heart' } },
    };

    const { container } = render(<UGCRenderer card={card} onError={onError} />);

    expect(container.textContent).toBe('');
    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_ICON_RESOLVER_MISSING', path: 'root' }),
    ]);
  });

  it('does not re-report the same invalid card on rerender', async () => {
    const invalidCard = { views: { Main: { type: 'Box' } } };
    const onError = vi.fn();

    const { rerender } = render(<UGCRenderer card={invalidCard as any} onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });

    rerender(<UGCRenderer card={invalidCard as any} onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  it('applies runtime style budgets to mapped CSS bytes instead of raw DSL bytes', () => {
    const onError = vi.fn();
    const node = {
      type: 'Box' as const,
      style: {
        fontFamily: 'handwriting',
      },
    };

    const rawStyleBytes = jsonUtf8Bytes(node.style);
    const mappedCssBytes = jsonUtf8Bytes(mapStyle(node.style, {}));

    expect(mappedCssBytes).toBeGreaterThan(rawStyleBytes);

    const result = renderNode(
      node,
      makeRenderContext({
        onError,
        limits: {
          nodeCount: 0,
          textBytes: 0,
          styleBytes: STYLE_OBJECTS_TOTAL_MAX_BYTES - rawStyleBytes,
          overflowAutoCount: 0,
        },
      }),
      'root',
    );

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_STYLE_LIMIT', path: 'root' }),
    ]);
  });

  it('counts only the currently active responsive mode toward runtime style bytes', () => {
    const node = {
      type: 'Box' as const,
      style: {
        color: '#111111',
      },
      responsive: {
        compact: {
          fontFamily: 'handwriting',
          backgroundGradient: {
            type: 'repeating-linear',
            direction: '45deg',
            stops: [
              { color: '#111111', position: '0%' },
              { color: '#222222', position: '50%' },
              { color: '#333333', position: '100%' },
            ],
          },
          clipPath: { type: 'circle', radius: '50%' },
          backdropBlur: 12,
        },
      },
    };

    const defaultEffectiveStyle = getEffectiveStyleForMode(node, undefined, 'default');
    const compactEffectiveStyle = getEffectiveStyleForMode(node, undefined, 'compact');
    const defaultCssBytes = jsonUtf8Bytes(mapStyle(defaultEffectiveStyle, {}));
    const compactCssBytes = jsonUtf8Bytes(mapStyle(compactEffectiveStyle, {}));

    expect(compactCssBytes).toBeGreaterThan(defaultCssBytes);

    const styleBudgetBeforeNode = STYLE_OBJECTS_TOTAL_MAX_BYTES - (compactCssBytes - 1);
    const defaultOnError = vi.fn();
    const compactOnError = vi.fn();

    const defaultResult = renderNode(
      node,
      makeRenderContext({
        onError: defaultOnError,
        limits: {
          nodeCount: 0,
          textBytes: 0,
          styleBytes: styleBudgetBeforeNode,
          overflowAutoCount: 0,
        },
      }),
      'root',
    );

    const compactResult = renderNode(
      node,
      makeRenderContext({
        onError: compactOnError,
        limits: {
          nodeCount: 0,
          textBytes: 0,
          styleBytes: styleBudgetBeforeNode,
          overflowAutoCount: 0,
        },
        responsive: {
          compact: true,
          medium: true,
        },
      }),
      'root',
    );

    expect(defaultResult).not.toBeNull();
    expect(defaultOnError).not.toHaveBeenCalled();
    expect(compactResult).toBeNull();
    expect(compactOnError).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'RUNTIME_STYLE_LIMIT', path: 'root' }),
    ]);
  });

  it('counts the compact effective style once instead of summing base and responsive branches', () => {
    const onError = vi.fn();
    const node = {
      type: 'Box' as const,
      style: {
        fontFamily: 'handwriting',
      },
      responsive: {
        compact: {
          clipPath: { type: 'circle', radius: '50%' },
          backdropBlur: 12,
        },
      },
    };

    const defaultCssBytes = jsonUtf8Bytes(
      mapStyle(getEffectiveStyleForMode(node, undefined, 'default'), {}),
    );
    const compactOverrideCssBytes = jsonUtf8Bytes(mapStyle(node.responsive.compact, {}));
    const compactEffectiveCssBytes = jsonUtf8Bytes(
      mapStyle(getEffectiveStyleForMode(node, undefined, 'compact'), {}),
    );

    expect(defaultCssBytes + compactOverrideCssBytes).toBeGreaterThan(compactEffectiveCssBytes);

    const result = renderNode(
      node,
      makeRenderContext({
        onError,
        limits: {
          nodeCount: 0,
          textBytes: 0,
          styleBytes: STYLE_OBJECTS_TOTAL_MAX_BYTES - compactEffectiveCssBytes,
          overflowAutoCount: 0,
        },
        responsive: {
          compact: true,
          medium: true,
        },
      }),
      'root',
    );

    expect(result).not.toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reconciles Accordion state when an expanded item becomes disabled', () => {
    const makeItems = (profileDisabled = false) => [
      {
        id: 'profile',
        label: 'Profile',
        content: 'Profile content',
        disabled: profileDisabled,
      },
      {
        id: 'inventory',
        label: 'Inventory',
        content: 'Inventory content',
      },
    ];

    const { rerender } = render(
      <Accordion items={makeItems(false)} defaultExpanded={['profile']} />,
    );

    expect(screen.getByText('Profile content')).toBeTruthy();

    rerender(<Accordion items={makeItems(true)} defaultExpanded={['profile']} />);

    expect(screen.queryByText('Profile content')).toBeNull();
  });
});
