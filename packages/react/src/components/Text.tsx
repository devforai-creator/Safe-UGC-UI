import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface TextComponentProps {
  content: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

/**
 * Renders text content safely. NEVER uses dangerouslySetInnerHTML.
 * All content is rendered as text nodes via React's built-in escaping.
 */
export function Text({ content, style, hoverStyle }: TextComponentProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return <span style={resolvedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{content}</span>;
}
