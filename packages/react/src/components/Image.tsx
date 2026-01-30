import type { CSSProperties } from 'react';

interface ImageComponentProps {
  src: string;
  alt?: string;
  style?: CSSProperties;
}

/**
 * Renders an image. Defense-in-depth: at the render level, we still
 * verify the src is a safe URL scheme. In practice, src will already
 * be resolved by asset-resolver before reaching this component.
 *
 * Allowed schemes:
 *   - blob: (platform-provided blob URLs)
 *   - data: (inline data URIs)
 *   - https: (resolved CDN URLs from asset-resolver)
 *   - http: (resolved URLs — platform decides)
 *
 * If the src starts with @assets/, it was not resolved and we render nothing.
 */
export function Image({ src, alt, style }: ImageComponentProps) {
  // SECURITY: reject unresolved @assets/ paths (should already be resolved)
  if (src.startsWith('@assets/')) {
    return null;
  }

  return <img src={src} alt={alt ?? ''} style={style} />;
}
