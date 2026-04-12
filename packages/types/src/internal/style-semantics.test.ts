import { describe, expect, it } from 'vitest';
import {
  getEffectiveStyleForMode,
  getMergedResponsiveStyleOverride,
  mergeNamedStyleRef,
} from './style-semantics.js';

describe('style semantics', () => {
  it('resolves named style refs and lets inline keys win', () => {
    const result = mergeNamedStyleRef(
      {
        $style: 'card',
        color: '#000',
        padding: 24,
      },
      {
        card: {
          color: '#fff',
          width: '100%',
        },
      },
    );

    expect(result).toEqual({
      color: '#000',
      padding: 24,
      width: '100%',
    });
  });

  it('drops a missing $style ref and preserves inline keys', () => {
    const result = mergeNamedStyleRef(
      {
        $style: 'missing',
        color: '#000',
      },
      {},
    );

    expect(result).toEqual({
      color: '#000',
    });
  });

  it('applies medium overrides on top of base style', () => {
    const result = getEffectiveStyleForMode(
      {
        style: { width: '720px', padding: 24, color: '#fff' },
        responsive: {
          medium: { width: '100%', padding: 16 },
        },
      },
      undefined,
      'medium',
    );

    expect(result).toEqual({
      width: '100%',
      padding: 16,
      color: '#fff',
    });
  });

  it('applies compact overrides on top of medium overrides', () => {
    const result = getEffectiveStyleForMode(
      {
        style: { width: '360px', padding: 24 },
        responsive: {
          medium: { width: '80%', padding: 16 },
          compact: { width: '100%', padding: 12, flexDirection: 'column' },
        },
      },
      undefined,
      'compact',
    );

    expect(result).toEqual({
      width: '100%',
      padding: 12,
      flexDirection: 'column',
    });
  });

  it('strips hoverStyle and transition from responsive overrides in effective styles', () => {
    const result = getEffectiveStyleForMode(
      {
        style: { width: '720px' },
        responsive: {
          medium: {
            width: '100%',
            hoverStyle: { opacity: 0.5 },
            transition: { property: 'opacity', duration: 300 },
          },
        },
      },
      undefined,
      'medium',
    );

    expect(result).toEqual({
      width: '100%',
    });
  });

  it('keeps base hoverStyle while applying compact overrides', () => {
    const result = getEffectiveStyleForMode(
      {
        style: {
          height: 200,
          hoverStyle: { height: 300 },
        },
        responsive: {
          compact: { height: 120 },
        },
      },
      undefined,
      'compact',
    );

    expect(result).toEqual({
      height: 120,
      hoverStyle: { height: 300 },
    });
  });

  it('merges responsive style refs before counting/inspection helpers consume them', () => {
    const result = getMergedResponsiveStyleOverride(
      {
        compact: {
          $style: 'compact-card',
          backgroundColor: '#000',
        },
      },
      {
        'compact-card': {
          width: '100%',
          padding: 12,
        },
      },
      'compact',
    );

    expect(result).toEqual({
      width: '100%',
      padding: 12,
      backgroundColor: '#000',
    });
  });
});
