import type { CSSProperties, ReactNode } from 'react';

interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  iconResolver?: (name: string) => ReactNode;
  style?: CSSProperties;
}

export function Icon({ name, size, color, iconResolver, style }: IconProps) {
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
        ...style,
      }}
    >
      {iconResolver(name)}
    </span>
  );
}
