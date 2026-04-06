/**
 * @safe-ugc-ui/react --- UGC Renderer
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
 *   - card:           UGCCard object or raw JSON string
 *   - viewName:       Name of the view to render (defaults to first view)
 *   - assets:         Mapping of asset keys to actual URLs
 *   - state:          Optional state override (merged with card.state, then revalidated)
 *   - onError:        Optional error callback
 *   - iconResolver:   Optional callback to resolve icon names to ReactNode
 *   - onAction:       Optional callback for Button/Toggle actions
 */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { validate, validateRaw } from '@safe-ugc-ui/validator';
import {
  COMPACT_BREAKPOINT_MAX_WIDTH,
  MEDIUM_BREAKPOINT_MAX_WIDTH,
  type UGCCard,
} from '@safe-ugc-ui/types';

import { UGCContainer } from './UGCContainer.js';
import { renderTree } from './node-renderer.js';
import type { AssetMap } from './asset-resolver.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UGCRendererProps {
  /** The UGC card to render --- either a parsed object or a raw JSON string. */
  card: UGCCard | string;

  /** Name of the view to render. Defaults to the first view in the card. */
  viewName?: string;

  /** Asset map: keys are asset identifiers, values are resolved URLs. */
  assets?: AssetMap;

  /** Optional state override. Merged on top of card.state and revalidated before render. */
  state?: Record<string, unknown>;

  /** Optional CSS style for the outer container. Protected isolation keys stay enforced. */
  containerStyle?: CSSProperties;

  /** Optional callback invoked when validation fails or runtime limits are hit. */
  onError?: (errors: Array<{ code: string; message: string; path: string }>) => void;

  /** Optional callback to resolve icon names to React elements. */
  iconResolver?: (name: string) => ReactNode;

  /** Optional callback for Button/Toggle interaction actions. */
  onAction?: (type: string, actionId: string, payload?: unknown) => void;
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
  iconResolver,
  onAction,
}: UGCRendererProps) {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(
    typeof window === 'undefined' ? null : window.innerWidth,
  );

  const result = useMemo(() => {
    let parsedCard: UGCCard | Record<string, unknown>;

    if (typeof card === 'string') {
      const rawValidationResult = validateRaw(card);
      if (!rawValidationResult.valid) {
        return { valid: false as const, errors: rawValidationResult.errors };
      }

      parsedCard = JSON.parse(card) as UGCCard;
    } else {
      parsedCard = card;
    }

    // Revalidate after merging runtime state so host-provided overrides
    // cannot bypass state-dependent validator rules.
    const mergedCard = {
      ...(parsedCard as Record<string, unknown>),
      state: {
        ...(((parsedCard as Record<string, unknown>).state as Record<string, unknown> | undefined) ?? {}),
        ...(stateOverride ?? {}),
      },
    };

    const validationResult = validate(mergedCard);
    if (!validationResult.valid) {
      return { valid: false as const, errors: validationResult.errors };
    }

    const cardObj = mergedCard as UGCCard;

    // Determine which view to render
    const views = cardObj.views;
    const viewKeys = Object.keys(views);
    const selectedView = viewName && viewName in views
      ? viewName
      : viewKeys[0];

    if (!selectedView || !(selectedView in views)) {
      return { valid: false as const, errors: [] };
    }

    const mergedState = cardObj.state ?? {};

    // Extract card-level styles
    const cardStyles = cardObj.styles as Record<string, Record<string, unknown>> | undefined;
    const fragments = cardObj.fragments as Record<string, unknown> | undefined;

    return {
      valid: true as const,
      rootNode: views[selectedView],
      state: mergedState,
      cardStyles,
      fragments,
    };
  }, [card, viewName, stateOverride]);

  useEffect(() => {
    if (!containerElement) {
      return;
    }

    const updateWidth = (nextWidth?: number) => {
      if (typeof nextWidth === 'number' && Number.isFinite(nextWidth)) {
        setContainerWidth(nextWidth);
        return;
      }
      setContainerWidth(containerElement.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        updateWidth(entry?.contentRect?.width);
      });
      observer.observe(containerElement);
      return () => observer.disconnect();
    }

    const handleResize = () => updateWidth();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerElement]);

  const responsive = useMemo(
    () => ({
      medium:
        containerWidth != null &&
        containerWidth <= MEDIUM_BREAKPOINT_MAX_WIDTH,
      compact:
        containerWidth != null &&
        containerWidth <= COMPACT_BREAKPOINT_MAX_WIDTH,
    }),
    [containerWidth],
  );

  // Handle invalid cards
  if (!result.valid) {
    if (onError && result.errors.length > 0) {
      onError(result.errors);
    }
    return null;
  }

  // Render the view tree inside the secure container
  return (
    <UGCContainer ref={setContainerElement} style={containerStyle}>
      {renderTree(
        result.rootNode,
        result.state,
        assets,
        result.cardStyles,
        iconResolver,
        onAction,
        onError,
        responsive,
        result.fragments,
      )}
    </UGCContainer>
  );
}
