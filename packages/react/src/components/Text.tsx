import type { CSSProperties } from 'react';

interface TextComponentProps {
  content: string;
  style?: CSSProperties;
}

/**
 * Renders text content safely. NEVER uses dangerouslySetInnerHTML.
 * All content is rendered as text nodes via React's built-in escaping.
 */
export function Text({ content, style }: TextComponentProps) {
  return <span style={style}>{content}</span>;
}
