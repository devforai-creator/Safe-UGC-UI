import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';
import { isSafeResolvedAssetUrl } from '../asset-resolver.js';

interface AvatarProps {
  src: string;
  alt?: string;
  size?: number | string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

export function Avatar({ src, alt, size, style, hoverStyle }: AvatarProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  if (!isSafeResolvedAssetUrl(src)) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      style={{
        width: size ?? 40,
        height: size ?? 40,
        borderRadius: '50%',
        objectFit: 'cover',
        ...resolvedStyle,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
