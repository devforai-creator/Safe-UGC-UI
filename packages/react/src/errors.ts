export interface RendererError {
  code: string;
  message: string;
  path: string;
}

export type RendererErrorHandler = (errors: RendererError[]) => void;

export function createRendererError(code: string, message: string, path: string): RendererError {
  return { code, message, path };
}
