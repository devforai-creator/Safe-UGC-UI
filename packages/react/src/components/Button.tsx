import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface ButtonProps {
  label: string;
  action: string;
  onAction?: (type: string, actionId: string) => void;
  disabled?: boolean;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function Button({ label, action, onAction, disabled, style, hoverStyle }: ButtonProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  return (
    <button
      disabled={disabled}
      onClick={() => onAction?.('button', action)}
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        border: '1px solid #ccc',
        cursor: disabled ? 'default' : 'pointer',
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </button>
  );
}
