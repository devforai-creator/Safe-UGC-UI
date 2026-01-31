/**
 * @safe-ugc-ui/react --- Node Renderer
 *
 * Recursive renderer that maps UGC node types to React components.
 * Supports all 16 component types, for-loop rendering, $style merge,
 * and runtime limits pre-check.
 *
 * For each node:
 *   1. Pre-check runtime limits (node count, style bytes, overflow, text bytes)
 *   2. Merge $style with inline styles
 *   3. Resolve $ref values in props using state-resolver (with locals)
 *   4. Map style props to React CSSProperties using style-mapper
 *   5. Resolve asset paths for Image/Avatar src using asset-resolver
 *   6. Render the appropriate component
 *   7. Recursively render children (arrays and for-loops)
 */

import type { ReactNode } from 'react';
import {
  MAX_NODE_COUNT,
  MAX_LOOP_ITERATIONS,
  TEXT_CONTENT_TOTAL_MAX_BYTES,
  STYLE_OBJECTS_TOTAL_MAX_BYTES,
  MAX_OVERFLOW_AUTO_COUNT,
} from '@safe-ugc-ui/types';

import { resolveRef, resolveValue } from './state-resolver.js';
import { mapStyle } from './style-mapper.js';
import { resolveAsset } from './asset-resolver.js';
import type { AssetMap } from './asset-resolver.js';
import { Box } from './components/Box.js';
import { Row } from './components/Row.js';
import { Column } from './components/Column.js';
import { Text } from './components/Text.js';
import { Image } from './components/Image.js';
import { Stack } from './components/Stack.js';
import { Grid } from './components/Grid.js';
import { Spacer } from './components/Spacer.js';
import { Divider } from './components/Divider.js';
import { Icon } from './components/Icon.js';
import { ProgressBar } from './components/ProgressBar.js';
import { Avatar } from './components/Avatar.js';
import { Badge } from './components/Badge.js';
import { Chip } from './components/Chip.js';
import { Button } from './components/Button.js';
import { Toggle } from './components/Toggle.js';

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

interface ForLoopLike {
  for: string;
  in: string;
  template: unknown;
}

/**
 * Runtime limits tracking object. Mutated during rendering to
 * track cumulative resource usage across the entire card.
 */
export interface RuntimeLimits {
  nodeCount: number;
  textBytes: number;
  styleBytes: number;
  overflowAutoCount: number;
}

export interface RenderContext {
  state: Record<string, unknown>;
  assets: AssetMap;
  locals?: Record<string, unknown>;
  cardStyles?: Record<string, Record<string, unknown>>;
  iconResolver?: (name: string) => ReactNode;
  onAction?: (type: string, actionId: string, payload?: unknown) => void;
  onError?: (errors: Array<{ code: string; message: string; path: string }>) => void;
  limits: RuntimeLimits;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isForLoop(obj: unknown): obj is ForLoopLike {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.for === 'string' && typeof o.in === 'string' && o.template != null;
}

function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair → 4 UTF-8 bytes
      bytes += 4;
      i++; // skip low surrogate
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * Merge $style from cardStyles with inline style.
 * Returns the merged raw style (unresolved $ref values) and the style
 * without $style key.
 */
function mergeStyleWithCardStyles(
  nodeStyle: Record<string, unknown> | undefined,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!nodeStyle) return undefined;

  const rawStyleName = nodeStyle.$style;
  const styleName = typeof rawStyleName === 'string' ? rawStyleName.trim() : rawStyleName;
  if (!styleName || typeof styleName !== 'string' || !cardStyles) {
    // Return style without $style key if present
    if (nodeStyle.$style !== undefined) {
      const { $style: _, ...rest } = nodeStyle;
      return rest;
    }
    return nodeStyle;
  }

  const baseStyle = cardStyles[styleName];
  if (!baseStyle) return nodeStyle;

  // Merge: base from cardStyles, overridden by inline (excluding $style key)
  const { $style: _, ...inlineWithout$style } = nodeStyle;
  return { ...baseStyle, ...inlineWithout$style };
}

// ---------------------------------------------------------------------------
// renderNode --- recursive node renderer
// ---------------------------------------------------------------------------

/**
 * Render a single UGC node to a React element.
 *
 * Performs runtime limits pre-check BEFORE rendering to prevent
 * DOM pollution when limits are exceeded.
 */
export function renderNode(
  node: unknown,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  if (node == null || typeof node !== 'object') return null;

  const n = node as UGCNodeLike;
  if (!n.type) return null;

  // --- Compute all deltas before committing any ---
  const mergedRawStyle = mergeStyleWithCardStyles(n.style, ctx.cardStyles);
  const props = n.props ?? {};
  const rv = (val: unknown) => resolveValue(val, ctx.state, ctx.locals);

  const styleDelta = mergedRawStyle ? utf8ByteLength(JSON.stringify(mergedRawStyle)) : 0;
  const overflowDelta = mergedRawStyle?.overflow === 'auto' ? 1 : 0;

  // Text content: resolve once, reuse in render
  let resolvedTextContent: string | undefined;
  let textDelta = 0;
  if (n.type === 'Text') {
    const raw = rv(props.content);
    resolvedTextContent = typeof raw === 'string' ? raw : '';
    textDelta = utf8ByteLength(resolvedTextContent);
  }

  // --- Batch limit checks (all-or-nothing) ---
  if (ctx.limits.nodeCount + 1 > MAX_NODE_COUNT) {
    ctx.onError?.([{ code: 'RUNTIME_NODE_LIMIT', message: `Node count exceeds maximum of ${MAX_NODE_COUNT}`, path: String(key) }]);
    return null;
  }
  if (ctx.limits.styleBytes + styleDelta > STYLE_OBJECTS_TOTAL_MAX_BYTES) {
    ctx.onError?.([{ code: 'RUNTIME_STYLE_LIMIT', message: `Style bytes exceed maximum of ${STYLE_OBJECTS_TOTAL_MAX_BYTES}`, path: String(key) }]);
    return null;
  }
  if (ctx.limits.overflowAutoCount + overflowDelta > MAX_OVERFLOW_AUTO_COUNT) {
    ctx.onError?.([{ code: 'RUNTIME_OVERFLOW_LIMIT', message: `Overflow auto count exceeds maximum of ${MAX_OVERFLOW_AUTO_COUNT}`, path: String(key) }]);
    return null;
  }
  if (ctx.limits.textBytes + textDelta > TEXT_CONTENT_TOTAL_MAX_BYTES) {
    ctx.onError?.([{ code: 'RUNTIME_TEXT_LIMIT', message: `Text bytes exceed maximum of ${TEXT_CONTENT_TOTAL_MAX_BYTES}`, path: String(key) }]);
    return null;
  }

  // --- All checks passed: commit all deltas at once ---
  ctx.limits.nodeCount += 1;
  ctx.limits.styleBytes += styleDelta;
  ctx.limits.overflowAutoCount += overflowDelta;
  ctx.limits.textBytes += textDelta;

  // Resolve style to CSS
  const cssStyle = mapStyle(mergedRawStyle, ctx.state, ctx.locals);

  // Render children recursively
  const childElements = renderChildren(n.children, ctx);

  switch (n.type) {
    case 'Box':
      return <Box key={key} style={cssStyle}>{childElements}</Box>;

    case 'Row':
      return <Row key={key} style={cssStyle}>{childElements}</Row>;

    case 'Column':
      return <Column key={key} style={cssStyle}>{childElements}</Column>;

    case 'Stack':
      return <Stack key={key} style={cssStyle}>{childElements}</Stack>;

    case 'Grid':
      return <Grid key={key} style={cssStyle}>{childElements}</Grid>;

    case 'Text':
      return <Text key={key} content={resolvedTextContent!} style={cssStyle} />;

    case 'Image': {
      let src = rv(props.src);
      if (typeof src !== 'string' || !src) return null;
      if (!src.startsWith('@assets/')) return null;
      if (src.includes('../')) return null;
      const resolved = resolveAsset(src, ctx.assets);
      if (!resolved) return null;
      if (typeof resolved === 'string' && resolved.trim().toLowerCase().startsWith('javascript:')) return null;
      const resolvedAlt = rv(props.alt);
      const alt = typeof resolvedAlt === 'string' ? resolvedAlt : undefined;
      return <Image key={key} src={resolved} alt={alt} style={cssStyle} />;
    }

    case 'Avatar': {
      let src = rv(props.src);
      if (typeof src !== 'string' || !src) return null;
      if (!src.startsWith('@assets/')) return null;
      if (src.includes('../')) return null;
      const resolved = resolveAsset(src, ctx.assets);
      if (!resolved) return null;
      if (typeof resolved === 'string' && resolved.trim().toLowerCase().startsWith('javascript:')) return null;
      const resolvedSize = rv(props.size);
      const size = typeof resolvedSize === 'number' || typeof resolvedSize === 'string'
        ? resolvedSize : undefined;
      return <Avatar key={key} src={resolved} size={size} style={cssStyle} />;
    }

    case 'Icon': {
      const name = typeof props.name === 'string' ? props.name : '';
      const resolvedSize = rv(props.size);
      const size = typeof resolvedSize === 'number' || typeof resolvedSize === 'string'
        ? resolvedSize : undefined;
      const resolvedColor = rv(props.color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return (
        <Icon
          key={key}
          name={name}
          size={size}
          color={color}
          iconResolver={ctx.iconResolver}
          style={cssStyle}
        />
      );
    }

    case 'Spacer': {
      const resolvedSize = rv(props.size);
      const size = typeof resolvedSize === 'number' || typeof resolvedSize === 'string'
        ? resolvedSize : undefined;
      return <Spacer key={key} size={size} style={cssStyle} />;
    }

    case 'Divider': {
      const resolvedColor = rv(props.color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      const resolvedThickness = rv(props.thickness);
      const thickness = typeof resolvedThickness === 'number' || typeof resolvedThickness === 'string'
        ? resolvedThickness : undefined;
      return <Divider key={key} color={color} thickness={thickness} style={cssStyle} />;
    }

    case 'ProgressBar': {
      const resolvedValue = rv(props.value);
      const value = typeof resolvedValue === 'number' ? resolvedValue : 0;
      const resolvedMax = rv(props.max);
      const max = typeof resolvedMax === 'number' ? resolvedMax : 100;
      const resolvedColor = rv(props.color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return <ProgressBar key={key} value={value} max={max} color={color} style={cssStyle} />;
    }

    case 'Badge': {
      const resolvedLabel = rv(props.label);
      const label = typeof resolvedLabel === 'string' ? resolvedLabel : '';
      const resolvedColor = rv(props.color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return <Badge key={key} label={label} color={color} style={cssStyle} />;
    }

    case 'Chip': {
      const resolvedLabel = rv(props.label);
      const label = typeof resolvedLabel === 'string' ? resolvedLabel : '';
      const resolvedColor = rv(props.color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return <Chip key={key} label={label} color={color} style={cssStyle} />;
    }

    case 'Button': {
      const resolvedLabel = rv(props.label);
      const label = typeof resolvedLabel === 'string' ? resolvedLabel : '';
      const action = typeof props.action === 'string' ? props.action : '';
      return (
        <Button
          key={key}
          label={label}
          action={action}
          onAction={ctx.onAction}
          style={cssStyle}
        />
      );
    }

    case 'Toggle': {
      const resolvedValue = rv(props.value);
      const value = typeof resolvedValue === 'boolean' ? resolvedValue : false;
      const onToggle = typeof props.onToggle === 'string' ? props.onToggle : '';
      return (
        <Toggle
          key={key}
          value={value}
          onToggle={onToggle}
          onAction={ctx.onAction}
          style={cssStyle}
        />
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// renderChildren --- handle children arrays and for-loops
// ---------------------------------------------------------------------------

function renderChildren(
  children: unknown,
  ctx: RenderContext,
): ReactNode[] | null {
  if (!children) return null;

  // Array children
  if (Array.isArray(children)) {
    return children.map((child, index) => renderNode(child, ctx, index));
  }

  // For-loop children
  if (isForLoop(children)) {
    return renderForLoop(children, ctx);
  }

  return null;
}

// ---------------------------------------------------------------------------
// renderForLoop --- iterate over state array, render template per item
// ---------------------------------------------------------------------------

function renderForLoop(
  loop: ForLoopLike,
  ctx: RenderContext,
): ReactNode[] {
  // Resolve the source array from state (or locals)
  const source = resolveRef(loop.in, ctx.state, ctx.locals);
  if (source === undefined) {
    // Soft skip: source not found (may be provided at runtime or optional)
    return [];
  }
  if (!Array.isArray(source)) {
    // Hard error: source exists but is not an array (type mismatch)
    ctx.onError?.([{
      code: 'RUNTIME_LOOP_SOURCE_INVALID',
      message: `Loop source "${loop.in}" is not an array (got ${typeof source})`,
      path: `for(${loop.for} in ${loop.in})`,
    }]);
    return [];
  }

  // Cap iterations
  const maxIter = Math.min(source.length, MAX_LOOP_ITERATIONS);
  const elements: ReactNode[] = [];

  for (let i = 0; i < maxIter; i++) {
    const item = source[i];
    const newLocals: Record<string, unknown> = {
      ...ctx.locals,
      [loop.for]: item,
      index: i,
    };
    const childCtx: RenderContext = { ...ctx, locals: newLocals };
    elements.push(renderNode(loop.template, childCtx, i));
  }

  return elements;
}

// ---------------------------------------------------------------------------
// RenderTree --- render an entire view tree
// ---------------------------------------------------------------------------

/**
 * Render a full view tree starting from the root node.
 *
 * @param rootNode - The root node of the view
 * @param state - Card state for $ref resolution
 * @param assets - Asset map for @assets/ resolution
 * @param cardStyles - Optional card-level named styles
 * @param iconResolver - Optional icon resolver callback
 * @param onAction - Optional action callback for Button/Toggle
 * @param onError - Optional error callback
 * @returns A React element tree
 */
export function renderTree(
  rootNode: unknown,
  state: Record<string, unknown>,
  assets: AssetMap,
  cardStyles?: Record<string, Record<string, unknown>>,
  iconResolver?: (name: string) => ReactNode,
  onAction?: (type: string, actionId: string, payload?: unknown) => void,
  onError?: (errors: Array<{ code: string; message: string; path: string }>) => void,
): ReactNode {
  const limits: RuntimeLimits = {
    nodeCount: 0,
    textBytes: 0,
    styleBytes: 0,
    overflowAutoCount: 0,
  };
  const ctx: RenderContext = {
    state,
    assets,
    cardStyles,
    iconResolver,
    onAction,
    onError,
    limits,
  };
  return renderNode(rootNode, ctx, 'root');
}
