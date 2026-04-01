import type { CSSProperties, ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface ColumnProps {
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
}

const columnBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export function Column({ style, hoverStyle, children }: ColumnProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return <div style={{ ...columnBase, ...resolvedStyle }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</div>;
}
