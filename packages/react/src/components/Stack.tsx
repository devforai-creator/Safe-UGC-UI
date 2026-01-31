import type { CSSProperties, ReactNode } from 'react';

interface StackProps {
  style?: CSSProperties;
  children?: ReactNode;
}

const stackBase: CSSProperties = {
  position: 'relative',
};

export function Stack({ style, children }: StackProps) {
  return <div style={{ ...stackBase, ...style }}>{children}</div>;
}
