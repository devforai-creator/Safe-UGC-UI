import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { UGCRenderer } from './UGCRenderer.js';
import { renderTree } from './node-renderer.js';
import { Accordion } from './components/Accordion.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
