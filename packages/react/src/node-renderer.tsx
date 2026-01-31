/**
 * @safe-ugc-ui/react — Node Renderer
 *
 * Recursive renderer that maps UGC node types to React components.
 * Phase 1 MVP supports: Box, Row, Column, Text, Image.
 *
 * For each node:
 *   1. Resolve $ref values in props using state-resolver
 *   2. Map style props to React CSSProperties using style-mapper
 *   3. Resolve asset paths for Image src using asset-resolver
 *   4. Render the appropriate component
 *   5. Recursively render children (arrays only; for-loops are Phase 2)
 *   6. Unsupported node types render null
 */

import type { ReactNode } from 'react';
import { PHASE1_COMPONENT_TYPES } from '@safe-ugc-ui/types';

import { resolveValue } from './state-resolver.js';
import { mapStyle } from './style-mapper.js';
import { resolveAsset } from './asset-resolver.js';
import type { AssetMap } from './asset-resolver.js';
import { Box } from './components/Box.js';
import { Row } from './components/Row.js';
import { Column } from './components/Column.js';
import { Text } from './components/Text.js';
import { Image } from './components/Image.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A generic UGC node shape. We use Record<string, unknown> for flexibility
 * since the validator has already verified the structure before rendering.
 */
interface UGCNodeLike {
  type: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: unknown;
  condition?: unknown;
}

interface RenderContext {
  state: Record<string, unknown>;
  assets: AssetMap;
}

// ---------------------------------------------------------------------------
// Phase 1 type set
// ---------------------------------------------------------------------------

const PHASE1_TYPES: ReadonlySet<string> = new Set(PHASE1_COMPONENT_TYPES);

// ---------------------------------------------------------------------------
// renderNode — recursive node renderer
// ---------------------------------------------------------------------------

/**
 * Render a single UGC node to a React element.
 *
 * @param node - The node object from the card tree
 * @param ctx - Render context (state + assets)
 * @param key - React key for list rendering
 * @returns A React element or null
 */
export function renderNode(
  node: unknown,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  if (node == null || typeof node !== 'object') return null;

  const n = node as UGCNodeLike;

  // Only render Phase 1 types
  if (!n.type || !PHASE1_TYPES.has(n.type)) {
    return null;
  }

  // Resolve style
  const cssStyle = mapStyle(n.style, ctx.state);

  // Render children recursively (only arrays; for-loops are Phase 2)
  const childElements = renderChildren(n.children, ctx);

  switch (n.type) {
    case 'Box':
      return (
        <Box key={key} style={cssStyle}>
          {childElements}
        </Box>
      );

    case 'Row':
      return (
        <Row key={key} style={cssStyle}>
          {childElements}
        </Row>
      );

    case 'Column':
      return (
        <Column key={key} style={cssStyle}>
          {childElements}
        </Column>
      );

    case 'Text': {
      const props = n.props ?? {};
      const resolvedContent = resolveValue(props.content, ctx.state);
      const content = typeof resolvedContent === 'string' ? resolvedContent : '';
      return <Text key={key} content={content} style={cssStyle} />;
    }

    case 'Image': {
      const props = n.props ?? {};

      // Resolve src (may be a $ref)
      let src = resolveValue(props.src, ctx.state);
      if (typeof src !== 'string' || !src) return null;

      // SECURITY: Only @assets/ paths are allowed
      if (!src.startsWith('@assets/')) {
        return null;
      }

      // SECURITY: Block path traversal
      if (src.includes('../')) {
        return null;
      }

      // Resolve via asset-resolver
      const resolved = resolveAsset(src, ctx.assets);
      if (!resolved) return null;

      // SECURITY: Block javascript: scheme on resolved URL (defense-in-depth)
      if (typeof resolved === 'string' && resolved.trim().toLowerCase().startsWith('javascript:')) {
        return null;
      }

      // Resolve alt
      const resolvedAlt = resolveValue(props.alt, ctx.state);
      const alt = typeof resolvedAlt === 'string' ? resolvedAlt : undefined;

      return <Image key={key} src={resolved} alt={alt} style={cssStyle} />;
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// renderChildren — handle children arrays (Phase 1: arrays only)
// ---------------------------------------------------------------------------

function renderChildren(
  children: unknown,
  ctx: RenderContext,
): ReactNode[] | null {
  if (!children) return null;

  // Phase 1: only support array children
  if (Array.isArray(children)) {
    return children.map((child, index) => renderNode(child, ctx, index));
  }

  // For-loop children are Phase 2 — skip
  return null;
}

// ---------------------------------------------------------------------------
// RenderTree — render an entire view tree
// ---------------------------------------------------------------------------

/**
 * Render a full view tree starting from the root node.
 *
 * @param rootNode - The root node of the view
 * @param state - Card state for $ref resolution
 * @param assets - Asset map for @assets/ resolution
 * @returns A React element tree
 */
export function renderTree(
  rootNode: unknown,
  state: Record<string, unknown>,
  assets: AssetMap,
): ReactNode {
  return renderNode(rootNode, { state, assets }, 'root');
}
