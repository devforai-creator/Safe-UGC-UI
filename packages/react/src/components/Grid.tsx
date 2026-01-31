import type { CSSProperties, ReactNode } from 'react';

interface GridProps {
  style?: CSSProperties;
  children?: ReactNode;
}

const gridBase: CSSProperties = {
  display: 'grid',
};

export function Grid({ style, children }: GridProps) {
  return <div style={{ ...gridBase, ...style }}>{children}</div>;
}
