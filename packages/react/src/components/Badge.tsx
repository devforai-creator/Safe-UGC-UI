import type { CSSProperties } from 'react';

interface BadgeProps {
  label: string;
  color?: string;
  style?: CSSProperties;
}

export function Badge({ label, color, style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        backgroundColor: color ?? '#e0e0e0',
        fontSize: 12,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
