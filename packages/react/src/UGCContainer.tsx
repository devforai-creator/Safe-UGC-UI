/**
 * @safe-ugc-ui/react — UGC Container
 *
 * Wrapper component that provides security isolation for UGC content.
 *
 * CSS isolation features:
 *   - overflow: hidden  — prevents content from escaping bounds
 *   - isolation: isolate — creates a new stacking context
 *   - contain: content   — limits layout/paint/style to this subtree
 *   - position: relative — establishes positioning context for children
 */

import type { CSSProperties, ReactNode } from 'react';

interface UGCContainerProps {
  children?: ReactNode;
  style?: CSSProperties;
}

const containerStyle: CSSProperties = {
  overflow: 'hidden',
  isolation: 'isolate',
  contain: 'content',
  position: 'relative',
};

/**
 * Security isolation wrapper for UGC content.
 * All UGC card renderings should be wrapped in this container.
 */
export function UGCContainer({ children, style }: UGCContainerProps) {
  const mergedStyle: CSSProperties = style
    ? { ...containerStyle, ...style }
    : containerStyle;

  return <div style={mergedStyle}>{children}</div>;
}
