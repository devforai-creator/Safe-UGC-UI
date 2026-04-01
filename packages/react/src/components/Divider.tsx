import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface DividerProps {
  color?: string;
  thickness?: number | string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

function formatThickness(thickness: number | string | undefined): string {
  if (thickness == null) return '1px';
  if (typeof thickness === 'number') return `${thickness}px`;
  // Numeric string (e.g. "2") → append px
  if (/^-?\d+(\.\d+)?$/.test(thickness)) return `${thickness}px`;
  // Already has unit (e.g. "2px", "1rem") → use as-is
  return thickness;
}

export function Divider({ color, thickness, style, hoverStyle }: DividerProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return (
    <div
      style={{
        borderTop: `${formatThickness(thickness)} solid ${color ?? '#e0e0e0'}`,
        width: '100%',
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
