import { describe, expect, it } from 'vitest';
import { RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES } from '../constants.js';
import {
  hoverStylePropsSchema,
  responsiveStylePropsSchema,
  stylePropsSchema,
  textSpanStyleSchema,
} from '../styles.js';
import {
  HOVER_STYLE_ALLOWED_STYLE_KEYS,
  RESPONSIVE_STYLE_ALLOWED_STYLE_KEYS,
  STYLE_ALLOWED_STYLE_KEYS,
  TEXT_SPAN_ALLOWED_STYLE_KEYS,
} from './style-key-sets.js';

describe('style key set helpers', () => {
  it('tracks the base style schema keys exactly', () => {
    expect(STYLE_ALLOWED_STYLE_KEYS).toEqual(Object.keys(stylePropsSchema.shape));
  });

  it('includes hoverStyle as the wrapper key for hover-style validation', () => {
    expect(HOVER_STYLE_ALLOWED_STYLE_KEYS).toEqual([
      ...Object.keys(hoverStylePropsSchema.shape),
      'hoverStyle',
    ]);
  });

  it('extends responsive keys with the forbidden nested style keys', () => {
    expect(RESPONSIVE_STYLE_ALLOWED_STYLE_KEYS).toEqual([
      ...Object.keys(responsiveStylePropsSchema.shape),
      ...RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
    ]);
  });

  it('extends text span keys with the same forbidden nested style keys', () => {
    expect(TEXT_SPAN_ALLOWED_STYLE_KEYS).toEqual([
      ...Object.keys(textSpanStyleSchema.shape),
      ...RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
    ]);
  });
});
