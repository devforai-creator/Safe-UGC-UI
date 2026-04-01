/**
 * @safe-ugc-ui/react — useHoverStyle Hook
 *
 * Manages hover state for components with hoverStyle support.
 * Returns the merged style and mouse event handlers.
 *
 * When hoverStyle is not provided, returns base style with no handlers
 * to avoid unnecessary re-renders.
 */

import { useState, useMemo, type CSSProperties } from 'react';

interface UseHoverStyleResult {
  style: CSSProperties | undefined;
  onMouseEnter: (() => void) | undefined;
  onMouseLeave: (() => void) | undefined;
}

export function useHoverStyle(
  baseStyle: CSSProperties | undefined,
  hoverStyle: CSSProperties | undefined,
): UseHoverStyleResult {
  const [hovered, setHovered] = useState(false);

  const mergedStyle = useMemo(() => {
    if (!hoverStyle || !hovered) return baseStyle;
    return { ...baseStyle, ...hoverStyle };
  }, [baseStyle, hoverStyle, hovered]);

  if (!hoverStyle) {
    return { style: baseStyle, onMouseEnter: undefined, onMouseLeave: undefined };
  }

  return {
    style: mergedStyle,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}
