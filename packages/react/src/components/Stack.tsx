import type { CSSProperties, ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface StackProps {
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
}

const stackBase: CSSProperties = {
  position: 'relative',
};

export function Stack({ style, hoverStyle, children }: StackProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return <div style={{ ...stackBase, ...resolvedStyle }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</div>;
}
