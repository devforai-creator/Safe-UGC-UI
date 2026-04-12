import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface TextSpan {
  text: string;
  style?: CSSProperties;
}

interface TextComponentProps {
  content?: string;
  spans?: TextSpan[];
  maxLines?: number;
  truncate?: 'ellipsis' | 'clip';
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

function getClampStyle(
  maxLines: number | undefined,
  truncate: 'ellipsis' | 'clip' | undefined,
): CSSProperties | undefined {
  if (!maxLines || maxLines < 1) {
    return undefined;
  }

  if (maxLines === 1) {
    return {
      display: 'inline-block',
      maxWidth: '100%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: truncate ?? 'ellipsis',
    };
  }

  return {
    display: '-webkit-box',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: truncate ?? 'ellipsis',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
  };
}

/**
 * Renders text content safely. NEVER uses dangerouslySetInnerHTML.
 * All content is rendered as text nodes via React's built-in escaping.
 */
export function Text({
  content,
  spans,
  maxLines,
  truncate,
  style,
  hoverStyle,
}: TextComponentProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  const clampStyle = getClampStyle(maxLines, truncate);
  const mergedStyle = clampStyle ? { ...resolvedStyle, ...clampStyle } : resolvedStyle;

  return (
    <span style={mergedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {spans?.map((span, index) => (
        <span key={index} style={span.style}>
          {span.text}
        </span>
      )) ??
        content ??
        ''}
    </span>
  );
}
