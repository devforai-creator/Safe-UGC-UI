import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function ProgressBar({ value, max, color, style, hoverStyle }: ProgressBarProps) {
  const percentage = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);

  return (
    <div
      style={{
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          width: `${percentage}%`,
          backgroundColor: color ?? '#4caf50',
          height: 8,
        }}
      />
    </div>
  );
}
