import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface ChipProps {
  label: string;
  color?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function Chip({ label, color, style, hoverStyle }: ChipProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 16,
        border: `1px solid ${color ?? '#e0e0e0'}`,
        fontSize: 14,
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </span>
  );
}
