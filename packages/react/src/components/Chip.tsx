import type { CSSProperties } from 'react';

interface ChipProps {
  label: string;
  color?: string;
  style?: CSSProperties;
}

export function Chip({ label, color, style }: ChipProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 16,
        border: `1px solid ${color ?? '#e0e0e0'}`,
        fontSize: 14,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
