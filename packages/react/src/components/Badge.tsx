import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface BadgeProps {
  label: string;
  color?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function Badge({ label, color, style, hoverStyle }: BadgeProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        backgroundColor: color ?? '#e0e0e0',
        fontSize: 12,
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </span>
  );
}
