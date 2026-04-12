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

    rerender(
      <Accordion items={makeItems(true)} defaultExpanded={['profile']} />,
    );

    expect(screen.queryByText('Profile content')).toBeNull();
  });
});
