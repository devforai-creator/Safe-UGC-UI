import type { CSSProperties } from 'react';

interface ButtonProps {
  label: string;
  action: string;
  onAction?: (type: string, actionId: string) => void;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Button({ label, action, onAction, disabled, style }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={() => onAction?.('button', action)}
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        border: '1px solid #ccc',
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {label}
    </button>
  );
}
