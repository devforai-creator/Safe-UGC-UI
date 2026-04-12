import type { CSSProperties, ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface BoxProps {
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
}

export function Box({ style, hoverStyle, children }: BoxProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return (
    <div style={resolvedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}
