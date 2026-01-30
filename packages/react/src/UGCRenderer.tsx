/**
 * @safe-ugc-ui/react — UGC Renderer
 *
 * Top-level component that validates and renders a UGC card.
 *
 * Pipeline:
 *   1. Accept a card (UGCCard object or raw JSON string)
 *   2. Validate via @safe-ugc-ui/validator
 *   3. If invalid, render nothing (or optional error fallback)
 *   4. If valid, wrap in UGCContainer and render the view tree
 *
 * Props:
 *   - card:      UGCCard object or raw JSON string
 *   - viewName:  Name of the view to render (defaults to first view)
 *   - assets:    Mapping of asset keys to actual URLs
 *   - state:     Optional state override (merged with card.state)
 *   - onError:   Optional error callback
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { validate, validateRaw } from '@safe-ugc-ui/validator';
import type { UGCCard } from '@safe-ugc-ui/types';

import { UGCContainer } from './UGCContainer.js';
import { renderTree } from './node-renderer.js';
import type { AssetMap } from './asset-resolver.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UGCRendererProps {
  /** The UGC card to render — either a parsed object or a raw JSON string. */
  card: UGCCard | string;

  /** Name of the view to render. Defaults to the first view in the card. */
  viewName?: string;

  /** Asset map: keys are asset identifiers, values are resolved URLs. */
  assets?: AssetMap;

  /** Optional state override. Merged on top of the card's own state. */
  state?: Record<string, unknown>;

  /** Optional CSS style for the outer container. */
  containerStyle?: CSSProperties;

  /** Optional callback invoked when validation fails. */
  onError?: (errors: Array<{ code: string; message: string; path: string }>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Top-level UGC card renderer.
 *
 * Validates the card, then renders the specified view inside a secure
 * UGCContainer. Returns null if validation fails.
 */
export function UGCRenderer({
  card,
  viewName,
  assets = {},
  state: stateOverride,
  containerStyle,
  onError,
}: UGCRendererProps) {
  const result = useMemo(() => {
    // 1. Validate
    const validationResult =
      typeof card === 'string' ? validateRaw(card) : validate(card);

    if (!validationResult.valid) {
      return { valid: false as const, errors: validationResult.errors };
    }

    // 2. Parse card object
    const cardObj: UGCCard =
      typeof card === 'string'
        ? (JSON.parse(card) as UGCCard)
        : card;

    // 3. Determine which view to render
    const views = cardObj.views;
    const viewKeys = Object.keys(views);
    const selectedView = viewName && viewName in views
      ? viewName
      : viewKeys[0];

    if (!selectedView || !(selectedView in views)) {
      return { valid: false as const, errors: [] };
    }

    // 4. Merge state
    const mergedState: Record<string, unknown> = {
      ...(cardObj.state ?? {}),
      ...(stateOverride ?? {}),
    };

    return {
      valid: true as const,
      rootNode: views[selectedView],
      state: mergedState,
    };
  }, [card, viewName, stateOverride]);

  // Handle invalid cards
  if (!result.valid) {
    if (onError && result.errors.length > 0) {
      onError(result.errors);
    }
    return null;
  }

  // Render the view tree inside the secure container
  return (
    <UGCContainer style={containerStyle}>
      {renderTree(result.rootNode, result.state, assets)}
    </UGCContainer>
  );
}
