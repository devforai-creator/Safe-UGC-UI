import type { CSSProperties, ReactNode } from 'react';

interface RowProps {
  style?: CSSProperties;
  children?: ReactNode;
}

const rowBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
};

export function Row({ style, children }: RowProps) {
  return <div style={{ ...rowBase, ...style }}>{children}</div>;
}
