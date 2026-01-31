import type { CSSProperties } from 'react';

interface AvatarProps {
  src: string;
  alt?: string;
  size?: number | string;
  style?: CSSProperties;
}

export function Avatar({ src, alt, size, style }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt ?? ''}
      style={{
        width: size ?? 40,
        height: size ?? 40,
        borderRadius: '50%',
        objectFit: 'cover',
        ...style,
      }}
    />
  );
}
