import {
  RESPONSIVE_MODES,
  getEffectiveStyleForMode as getEffectiveStyleForModeFromShared,
  getMergedResponsiveStyleOverride as getMergedResponsiveStyleOverrideFromShared,
  type ResponsiveMode,
} from '@safe-ugc-ui/types/internal/style-semantics';
import type { TraversableNode } from './traverse.js';

export { RESPONSIVE_MODES };
export type { ResponsiveMode };

export function getEffectiveStyleForMode(
  node: TraversableNode,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  mode: ResponsiveMode,
): Record<string, unknown> | undefined {
  return getEffectiveStyleForModeFromShared(node, cardStyles, mode);
}

export function getMergedResponsiveStyleOverride(
  node: TraversableNode,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
  mode: Exclude<ResponsiveMode, 'default'>,
): Record<string, unknown> | undefined {
  return getMergedResponsiveStyleOverrideFromShared(node.responsive, cardStyles, mode);
}
