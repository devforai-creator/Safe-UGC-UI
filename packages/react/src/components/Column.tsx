import type { CSSProperties, ReactNode } from 'react';

interface ColumnProps {
  style?: CSSProperties;
  children?: ReactNode;
}

const columnBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export function Column({ style, children }: ColumnProps) {
  return <div style={{ ...columnBase, ...style }}>{children}</div>;
}
