import type { CSSProperties, ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface GridProps {
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
}

const gridBase: CSSProperties = {
  display: 'grid',
};

export function Grid({ style, hoverStyle, children }: GridProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return <div style={{ ...gridBase, ...resolvedStyle }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</div>;
}
