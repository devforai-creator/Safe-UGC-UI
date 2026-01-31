import type { CSSProperties } from 'react';

interface SpacerProps {
  size?: number | string;
  style?: CSSProperties;
}

export function Spacer({ size, style }: SpacerProps) {
  return <div style={{ width: size, height: size, flexShrink: 0, ...style }} />;
}
