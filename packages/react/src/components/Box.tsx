import type { CSSProperties, ReactNode } from 'react';

interface BoxProps {
  style?: CSSProperties;
  children?: ReactNode;
}

export function Box({ style, children }: BoxProps) {
  return <div style={style}>{children}</div>;
}
