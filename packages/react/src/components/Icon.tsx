import type { CSSProperties, ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  iconResolver?: (name: string) => ReactNode;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function Icon({ name, size, color, iconResolver, style, hoverStyle }: IconProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);

  if (!iconResolver) {
    return null;
  }

  return (
    <span
      style={{
        fontSize: size,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {iconResolver(name)}
    </span>
  );
}
