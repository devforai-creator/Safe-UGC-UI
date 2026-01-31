import type { CSSProperties } from 'react';

interface DividerProps {
  color?: string;
  thickness?: number | string;
  style?: CSSProperties;
}

export function Divider({ color, thickness, style }: DividerProps) {
  return (
    <div
      style={{
        borderTop: `${thickness ?? 1}px solid ${color ?? '#e0e0e0'}`,
        width: '100%',
        ...style,
      }}
    />
  );
}
