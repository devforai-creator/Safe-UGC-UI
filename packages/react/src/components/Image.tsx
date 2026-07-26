import type { CSSProperties } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';
import { isSafeResolvedAssetUrl } from '../asset-resolver.js';

interface ImageComponentProps {
  src: string;
  alt?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

/**
 * Renders an image. Defense-in-depth: reject unresolved asset paths,
 * unsupported URL schemes, and non-raster data URLs at render time.
 */
export function Image({ src, alt, style, hoverStyle }: ImageComponentProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);

  if (!isSafeResolvedAssetUrl(src)) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      style={resolvedStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
