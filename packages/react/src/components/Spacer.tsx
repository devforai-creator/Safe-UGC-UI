import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface SpacerProps {
  size?: number | string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function Spacer({ size, style, hoverStyle }: SpacerProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return (
    <div
      style={{ width: size, height: size, flexShrink: 0, ...resolvedStyle }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
