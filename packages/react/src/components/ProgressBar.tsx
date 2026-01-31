import type { CSSProperties } from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  style?: CSSProperties;
}

export function ProgressBar({ value, max, color, style }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      style={{
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
        ...style,
      }}
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
