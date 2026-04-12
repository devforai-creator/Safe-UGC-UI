import {
  hoverStylePropsSchema,
  responsiveStylePropsSchema,
  stylePropsSchema,
  textSpanStyleSchema,
} from '../styles.js';
import { RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES } from '../constants.js';

export const STYLE_ALLOWED_STYLE_KEYS = Object.keys(stylePropsSchema.shape);

export const HOVER_STYLE_ALLOWED_STYLE_KEYS = [
  ...Object.keys(hoverStylePropsSchema.shape),
  'hoverStyle',
];

export const RESPONSIVE_STYLE_ALLOWED_STYLE_KEYS = [
  ...Object.keys(responsiveStylePropsSchema.shape),
  ...RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
];

export const TEXT_SPAN_ALLOWED_STYLE_KEYS = [
  ...Object.keys(textSpanStyleSchema.shape),
  ...RESPONSIVE_FORBIDDEN_STYLE_PROPERTIES,
];
