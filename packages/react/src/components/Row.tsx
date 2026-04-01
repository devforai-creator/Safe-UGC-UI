import type { CSSProperties, ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface RowProps {
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
}

const rowBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
};

export function Row({ style, hoverStyle, children }: RowProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return <div style={{ ...rowBase, ...resolvedStyle }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</div>;
}
