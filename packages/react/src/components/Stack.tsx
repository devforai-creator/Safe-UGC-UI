import type { CSSProperties, ReactNode } from 'react';

interface StackProps {
  style?: CSSProperties;
  children?: ReactNode;
}

const stackBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export function Stack({ style, children }: StackProps) {
  return <div style={{ ...stackBase, ...style }}>{children}</div>;
}
