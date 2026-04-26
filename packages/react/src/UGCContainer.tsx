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

import { forwardRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface UGCContainerProps {
  children?: ReactNode;
  style?: CSSProperties;
  hostOverflow?: 'hidden' | 'visible' | 'auto' | 'scroll';
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
 * Consumer styles may extend the container, but cannot override the
 * core isolation properties defined above.
 */
export const UGCContainer = forwardRef<HTMLDivElement, UGCContainerProps>(function UGCContainer(
  { children, style, hostOverflow },
  ref,
) {
  const mergedStyle: CSSProperties = {
    ...style,
    ...containerStyle,
    ...(hostOverflow ? { overflow: hostOverflow } : {}),
  };

  return (
    <div ref={ref} style={mergedStyle}>
      {children}
    </div>
  );
});
