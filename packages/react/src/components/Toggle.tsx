import type { CSSProperties } from 'react';

interface ToggleProps {
  value: boolean;
  onToggle: string;
  onAction?: (type: string, actionId: string, payload?: unknown) => void;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Toggle({ value, onToggle, onAction, disabled, style }: ToggleProps) {
  return (
    <button
      disabled={disabled}
      onClick={() => onAction?.('toggle', onToggle, { value: !value })}
      style={{
        padding: '6px 16px',
        borderRadius: 12,
        border: '1px solid #ccc',
        backgroundColor: value ? '#4caf50' : '#e0e0e0',
        color: value ? '#fff' : '#333',
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {value ? 'ON' : 'OFF'}
    </button>
  );
}
