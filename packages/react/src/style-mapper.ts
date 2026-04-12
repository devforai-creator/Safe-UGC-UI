/**
 * React-facing wrapper around the shared style-output helper.
 *
 * The actual style-to-CSS resolution logic now lives in
 * `@safe-ugc-ui/types/internal/style-output` so the validator can measure the
 * same render output contract that the renderer enforces at runtime.
 */

import type { CSSProperties } from 'react';
import { mapStyleToRenderOutput } from '@safe-ugc-ui/types/internal/style-output';

export { mapTransition } from '@safe-ugc-ui/types/internal/style-output';

export function mapStyle(
  style: Record<string, unknown> | undefined,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): CSSProperties {
  return mapStyleToRenderOutput(style, state, locals) as CSSProperties;
}
