import { describe, expect, it } from 'vitest';
import {
  countResolvedStyleOutputBytes,
  mapStyleToRenderOutput,
  utf8ByteLength,
} from './style-output.js';

describe('style output helpers', () => {
  it('expands fontFamily tokens into renderer CSS stacks', () => {
    const result = mapStyleToRenderOutput({ fontFamily: 'handwriting' }, {});

    expect(result.fontFamily).toContain('Comic Sans MS');
    expect(result.fontFamily).toContain('cursive');
  });

  it('counts mapped CSS output instead of the authored token payload', () => {
    const rawStyle = { fontFamily: 'handwriting' };
    const rawBytes = utf8ByteLength(JSON.stringify(rawStyle));
    const outputBytes = countResolvedStyleOutputBytes(rawStyle, {});

    expect(outputBytes).toBeGreaterThan(rawBytes);
  });
});
