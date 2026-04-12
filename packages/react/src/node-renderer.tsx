/**
 * @safe-ugc-ui/react --- Node Renderer
 *
 * Recursive renderer that maps UGC node types to React components.
 * Supports all currently implemented component types, for-loop rendering, style reference merge,
 * and runtime limits pre-check.
 *
 * For each node:
 *   1. Pre-check runtime limits (node count, style bytes, overflow, text bytes)
 *   2. Merge $style with inline styles (including hoverStyle.$style)
 *   3. Resolve $ref values in node fields using state-resolver (with locals)
 *   4. Map style fields to React CSSProperties using style-mapper
 *   5. Resolve asset paths for Image/Avatar src using asset-resolver
 *   6. Render the appropriate component
 *   7. Recursively render children (arrays and for-loops)
 */

import type { CSSProperties, ReactNode } from 'react';
import {
  MAX_NODE_COUNT,
  MAX_LOOP_ITERATIONS,
  TEXT_CONTENT_TOTAL_MAX_BYTES,
  STYLE_OBJECTS_TOTAL_MAX_BYTES,
  MAX_OVERFLOW_AUTO_COUNT,
} from '@safe-ugc-ui/types';

import { resolveRef, resolveTextValue, resolveValue } from './state-resolver.js';
import { evaluateCondition } from './condition-resolver.js';
import { mapStyle } from './style-mapper.js';
import { isSafeResolvedAssetUrl, resolveAsset } from './asset-resolver.js';
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
import { Accordion } from './components/Accordion.js';
import { Tabs } from './components/Tabs.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A generic UGC node shape. We use Record<string, unknown> for flexibility
 * since callers are expected to validate via loadCard/loadCardRaw or
 * UGCRenderer before using this low-level renderer directly.
 */
interface UGCNodeLike {
  type: string;
  style?: Record<string, unknown>;
  responsive?: Record<string, unknown>;
  children?: unknown;
  [key: string]: unknown;
}

interface ForLoopLike {
  for: string;
  in: string;
  template: unknown;
}

interface FragmentUseLike {
  $use: string;
  $if?: unknown;
  [key: string]: unknown;
}

interface ResolvedTextSpan {
  text: string;
  style?: CSSProperties;
}

interface ResolvedTextPayload {
  content?: string;
  spans?: ResolvedTextSpan[];
  textBytes: number;
  styleBytes: number;
}

interface ResolvedAccordionItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface ResolvedTabsItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
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
  fragments?: Record<string, unknown>;
  fragmentStack?: string[];
  iconResolver?: (name: string) => ReactNode;
  onAction?: (type: string, actionId: string, payload?: unknown) => void;
  onError?: (errors: Array<{ code: string; message: string; path: string }>) => void;
  limits: RuntimeLimits;
  responsive: {
    compact: boolean;
    medium: boolean;
  };
}

interface RuntimeRenderError {
  code: string;
  message: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isForLoop(obj: unknown): obj is ForLoopLike {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.for === 'string' && typeof o.in === 'string' && o.template != null;
}

function isFragmentUse(obj: unknown): obj is FragmentUseLike {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return typeof (obj as Record<string, unknown>).$use === 'string';
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
 * Merge a single style object from cardStyles with inline style overrides.
 * Returns the merged raw style (unresolved $ref values) and the style
 * without $style key.
 */
function mergeNamedStyle(
  style: Record<string, unknown> | undefined,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!style) return undefined;

  const rawStyleName = style.$style;
  const styleName = typeof rawStyleName === 'string' ? rawStyleName.trim() : rawStyleName;
  if (!styleName || typeof styleName !== 'string' || !cardStyles) {
    // Return style without $style key if present
    if (style.$style !== undefined) {
      const { $style: _, ...rest } = style;
      return rest;
    }
    return style;
  }

  const baseStyle = cardStyles[styleName];
  if (!baseStyle) return style;

  // Merge: base from cardStyles, overridden by inline (excluding $style key)
  const { $style: _, ...inlineWithout$style } = style;
  return { ...baseStyle, ...inlineWithout$style };
}

/**
 * Merge node style and nested hoverStyle against cardStyles.
 */
function mergeStyleWithCardStyles(
  nodeStyle: Record<string, unknown> | undefined,
  cardStyles: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  const mergedStyle = mergeNamedStyle(nodeStyle, cardStyles);
  if (!mergedStyle) return undefined;

  const rawHoverStyle = mergedStyle.hoverStyle;
  if (typeof rawHoverStyle !== 'object' || rawHoverStyle === null || Array.isArray(rawHoverStyle)) {
    return mergedStyle;
  }

  const mergedHoverStyle = mergeNamedStyle(
    rawHoverStyle as Record<string, unknown>,
    cardStyles,
  );

  if (!mergedHoverStyle) {
    return mergedStyle;
  }

  return {
    ...mergedStyle,
    hoverStyle: mergedHoverStyle,
  };
}

function getResponsiveOverrideStyle(
  nodeResponsive: Record<string, unknown> | undefined,
  mode: 'medium' | 'compact',
): Record<string, unknown> | undefined {
  if (!nodeResponsive) return undefined;

  const override = nodeResponsive[mode];
  if (
    override == null ||
    typeof override !== 'object' ||
    Array.isArray(override)
  ) {
    return undefined;
  }

  return override as Record<string, unknown>;
}

function mergeEffectiveNodeStyle(
  node: UGCNodeLike,
  ctx: RenderContext,
): Record<string, unknown> | undefined {
  const baseStyle = mergeStyleWithCardStyles(node.style, ctx.cardStyles);
  const mediumOverride = mergeNamedStyle(
    getResponsiveOverrideStyle(node.responsive, 'medium'),
    ctx.cardStyles,
  );
  const compactOverride = mergeNamedStyle(
    getResponsiveOverrideStyle(node.responsive, 'compact'),
    ctx.cardStyles,
  );

  const {
    hoverStyle: _mediumHoverStyle,
    transition: _mediumTransition,
    ...mediumStyleWithoutInteractiveFields
  } = mediumOverride ?? {};

  const {
    hoverStyle: _compactHoverStyle,
    transition: _compactTransition,
    ...compactStyleWithoutInteractiveFields
  } = compactOverride ?? {};

  return {
    ...(baseStyle ?? {}),
    ...(ctx.responsive.medium ? mediumStyleWithoutInteractiveFields : {}),
    ...(ctx.responsive.compact ? compactStyleWithoutInteractiveFields : {}),
  };
}

function resolveTextPayload(
  node: UGCNodeLike,
  ctx: RenderContext,
): ResolvedTextPayload {
  const rawSpans = Array.isArray(node.spans) ? node.spans : undefined;

  if (rawSpans) {
    const spans = rawSpans.map((span) => {
      const rawSpan = span as Record<string, unknown>;
      const spanStyle =
        rawSpan.style != null &&
        typeof rawSpan.style === 'object' &&
        !Array.isArray(rawSpan.style)
          ? rawSpan.style as Record<string, unknown>
          : undefined;
      const resolvedStyle = spanStyle
        ? mapStyle(spanStyle, ctx.state, ctx.locals)
        : undefined;

      return {
        text: resolveTextValue(rawSpan.text, ctx.state, ctx.locals),
        style: resolvedStyle,
        styleBytes:
          resolvedStyle && Object.keys(resolvedStyle).length > 0
            ? utf8ByteLength(JSON.stringify(resolvedStyle))
            : 0,
      };
    });

    const combinedText = spans.map((span) => span.text).join('');
    return {
      spans: spans.map(({ styleBytes: _styleBytes, ...span }) => span),
      textBytes: utf8ByteLength(combinedText),
      styleBytes: spans.reduce((sum, span) => sum + span.styleBytes, 0),
    };
  }

  const content = resolveTextValue(node.content, ctx.state, ctx.locals);
  return {
    content,
    textBytes: utf8ByteLength(content),
    styleBytes: 0,
  };
}

function countResolvedCssBytes(style: CSSProperties | undefined): number {
  if (!style || Object.keys(style).length === 0) {
    return 0;
  }

  return utf8ByteLength(JSON.stringify(style));
}

function countResolvedItemLabelBytes(
  items: unknown,
  ctx: RenderContext,
): number {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((total, item) => {
    if (
      item == null ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      return total;
    }

    const label = resolveTextValue(
      (item as Record<string, unknown>).label,
      ctx.state,
      ctx.locals,
    );
    return total + utf8ByteLength(label);
  }, 0);
}

function countDirectNodeTextBytes(
  node: UGCNodeLike,
  ctx: RenderContext,
): number {
  switch (node.type) {
    case 'Badge':
    case 'Chip':
    case 'Button':
      return utf8ByteLength(
        resolveTextValue(
          (node as Record<string, unknown>).label,
          ctx.state,
          ctx.locals,
        ),
      );
    case 'Accordion':
      return countResolvedItemLabelBytes(node.items, ctx);
    case 'Tabs':
      return countResolvedItemLabelBytes(node.tabs, ctx);
    default:
      return 0;
  }
}

function resolveAccordionItems(
  node: UGCNodeLike,
  ctx: RenderContext,
  key: string | number,
): ResolvedAccordionItem[] {
  const rawItems = Array.isArray(node.items) ? node.items : [];

  return rawItems.flatMap((item, index) => {
    if (
      item == null ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      return [];
    }

    const rawItem = item as Record<string, unknown>;
    const id = typeof rawItem.id === 'string' ? rawItem.id : `item-${index}`;
    const label = resolveTextValue(rawItem.label, ctx.state, ctx.locals);
    const resolvedDisabled = resolveValue(rawItem.disabled, ctx.state, ctx.locals);
    const disabled = typeof resolvedDisabled === 'boolean' ? resolvedDisabled : undefined;
    const content = renderNode(
      rawItem.content,
      ctx,
      `${String(key)}.items[${index}].content`,
    );

    return [{ id, label, content, disabled }];
  });
}

function resolveTabsItems(
  node: UGCNodeLike,
  ctx: RenderContext,
  key: string | number,
): ResolvedTabsItem[] {
  const rawTabs = Array.isArray(node.tabs) ? node.tabs : [];

  return rawTabs.flatMap((tab, index) => {
    if (
      tab == null ||
      typeof tab !== 'object' ||
      Array.isArray(tab)
    ) {
      return [];
    }

    const rawTab = tab as Record<string, unknown>;
    const id = typeof rawTab.id === 'string' ? rawTab.id : `tab-${index}`;
    const label = resolveTextValue(rawTab.label, ctx.state, ctx.locals);
    const resolvedDisabled = resolveValue(rawTab.disabled, ctx.state, ctx.locals);
    const disabled = typeof resolvedDisabled === 'boolean' ? resolvedDisabled : undefined;
    const content = renderNode(
      rawTab.content,
      ctx,
      `${String(key)}.tabs[${index}].content`,
    );

    return [{ id, label, content, disabled }];
  });
}

function renderSwitchBranch(
  node: UGCNodeLike,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  const resolvedValue = resolveValue(node.value, ctx.state, ctx.locals);
  const branchName = typeof resolvedValue === 'string' ? resolvedValue : undefined;
  const rawCases =
    node.cases != null &&
    typeof node.cases === 'object' &&
    !Array.isArray(node.cases)
      ? node.cases as Record<string, unknown>
      : undefined;

  if (branchName && rawCases && rawCases[branchName] !== undefined) {
    return renderNode(
      rawCases[branchName],
      ctx,
      `${String(key)}.cases.${branchName}`,
    );
  }

  if ('default' in node) {
    return renderNode(node.default, ctx, `${String(key)}.default`);
  }

  return null;
}

function reportRuntimeError(
  ctx: RenderContext,
  error: RuntimeRenderError,
): null {
  ctx.onError?.([error]);
  return null;
}

function resolveRuntimeAsset(
  nodeType: 'Image' | 'Avatar',
  key: string | number,
  rawSrc: unknown,
  ctx: RenderContext,
): string | null {
  const path = `${String(key)}.src`;

  if (typeof rawSrc !== 'string' || rawSrc.length === 0) {
    return reportRuntimeError(ctx, {
      code: 'RUNTIME_ASSET_SRC_INVALID',
      message: `${nodeType}.src must resolve to a non-empty string`,
      path,
    });
  }

  if (!rawSrc.startsWith('@assets/')) {
    return reportRuntimeError(ctx, {
      code: 'INVALID_ASSET_PATH',
      message: `Asset path must start with "@assets/". Got "${rawSrc}".`,
      path,
    });
  }

  if (rawSrc.includes('../')) {
    return reportRuntimeError(ctx, {
      code: 'ASSET_PATH_TRAVERSAL',
      message: `Asset path contains path traversal ("../"). Got "${rawSrc}".`,
      path,
    });
  }

  const resolved = resolveAsset(rawSrc, ctx.assets);
  if (!resolved) {
    return reportRuntimeError(ctx, {
      code: 'RUNTIME_ASSET_NOT_FOUND',
      message: `No asset mapping was found for "${rawSrc}".`,
      path,
    });
  }

  if (!isSafeResolvedAssetUrl(resolved)) {
    return reportRuntimeError(ctx, {
      code: 'RUNTIME_ASSET_URL_UNSAFE',
      message: `Resolved asset URL is unsafe for ${nodeType}.src. Got "${resolved}".`,
      path,
    });
  }

  return resolved;
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

  if (isFragmentUse(node)) {
    if ('$if' in node && !evaluateCondition(node.$if, ctx.state, ctx.locals)) {
      return null;
    }

    if ((ctx.fragmentStack?.length ?? 0) > 0) {
      ctx.onError?.([{
        code: 'RUNTIME_FRAGMENT_NESTED_USE',
        message: 'Fragments may not contain nested "$use" references',
        path: String(key),
      }]);
      return null;
    }

    if (ctx.fragmentStack?.includes(node.$use)) {
      ctx.onError?.([{
        code: 'RUNTIME_FRAGMENT_CYCLE',
        message: `Fragment "${node.$use}" recursively references itself`,
        path: String(key),
      }]);
      return null;
    }

    const fragment = ctx.fragments?.[node.$use];
    if (fragment == null) {
      ctx.onError?.([{
        code: 'RUNTIME_FRAGMENT_NOT_FOUND',
        message: `Fragment "${node.$use}" was not found`,
        path: String(key),
      }]);
      return null;
    }

    return renderNode(
      fragment,
      {
        ...ctx,
        fragmentStack: [...(ctx.fragmentStack ?? []), node.$use],
      },
      key,
    );
  }

  const n = node as UGCNodeLike;
  if (!n.type) return null;

  if ('$if' in n && !evaluateCondition(n.$if, ctx.state, ctx.locals)) {
    return null;
  }

  if (n.type === 'Switch') {
    return renderSwitchBranch(n, ctx, key);
  }

  // --- Compute all deltas before committing any ---
  const mergedRawStyle = mergeEffectiveNodeStyle(n, ctx);
  const rv = (val: unknown) => resolveValue(val, ctx.state, ctx.locals);
  const cssStyle = mapStyle(mergedRawStyle, ctx.state, ctx.locals);

  const rawHoverStyle = mergedRawStyle?.hoverStyle as Record<string, unknown> | undefined;
  const cssHoverStyle = rawHoverStyle ? mapStyle(rawHoverStyle, ctx.state, ctx.locals) : undefined;

  let styleDelta = countResolvedCssBytes(cssStyle) + countResolvedCssBytes(cssHoverStyle);
  const overflowDelta = mergedRawStyle?.overflow === 'auto' ? 1 : 0;

  // Text payload: resolve once, reuse in render
  let resolvedTextPayload: ResolvedTextPayload | undefined;
  let textDelta = countDirectNodeTextBytes(n, ctx);
  if (n.type === 'Text') {
    resolvedTextPayload = resolveTextPayload(n, ctx);
    textDelta = resolvedTextPayload.textBytes;
    styleDelta += resolvedTextPayload.styleBytes;
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

  // Render children recursively
  const childElements = renderChildren(n.children, ctx);

  switch (n.type) {
    case 'Box':
      return <Box key={key} style={cssStyle} hoverStyle={cssHoverStyle}>{childElements}</Box>;

    case 'Row':
      return <Row key={key} style={cssStyle} hoverStyle={cssHoverStyle}>{childElements}</Row>;

    case 'Column':
      return <Column key={key} style={cssStyle} hoverStyle={cssHoverStyle}>{childElements}</Column>;

    case 'Stack':
      return <Stack key={key} style={cssStyle} hoverStyle={cssHoverStyle}>{childElements}</Stack>;

    case 'Grid':
      return <Grid key={key} style={cssStyle} hoverStyle={cssHoverStyle}>{childElements}</Grid>;

    case 'Text': {
      const maxLines = typeof n.maxLines === 'number' ? n.maxLines : undefined;
      const truncate = n.truncate === 'clip' || n.truncate === 'ellipsis'
        ? n.truncate
        : undefined;

      return (
        <Text
          key={key}
          content={resolvedTextPayload?.content}
          spans={resolvedTextPayload?.spans}
          maxLines={maxLines}
          truncate={truncate}
          style={cssStyle}
          hoverStyle={cssHoverStyle}
        />
      );
    }

    case 'Image': {
      const src = rv((n as Record<string, unknown>).src);
      const resolved = resolveRuntimeAsset('Image', key, src, ctx);
      if (!resolved) return null;
      const resolvedAlt = rv((n as Record<string, unknown>).alt);
      const alt = typeof resolvedAlt === 'string' ? resolvedAlt : undefined;
      return <Image key={key} src={resolved} alt={alt} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'Avatar': {
      const src = rv((n as Record<string, unknown>).src);
      const resolved = resolveRuntimeAsset('Avatar', key, src, ctx);
      if (!resolved) return null;
      const resolvedSize = rv((n as Record<string, unknown>).size);
      const size = typeof resolvedSize === 'number' || typeof resolvedSize === 'string'
        ? resolvedSize : undefined;
      return <Avatar key={key} src={resolved} size={size} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'Icon': {
      const resolvedName = rv((n as Record<string, unknown>).name);
      const name = typeof resolvedName === 'string' ? resolvedName : '';
      const resolvedSize = rv((n as Record<string, unknown>).size);
      const size = typeof resolvedSize === 'number' || typeof resolvedSize === 'string'
        ? resolvedSize : undefined;
      const resolvedColor = rv((n as Record<string, unknown>).color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return (
        <Icon
          key={key}
          name={name}
          size={size}
          color={color}
          iconResolver={ctx.iconResolver}
          style={cssStyle}
          hoverStyle={cssHoverStyle}
        />
      );
    }

    case 'Spacer': {
      const resolvedSize = rv((n as Record<string, unknown>).size);
      const size = typeof resolvedSize === 'number' || typeof resolvedSize === 'string'
        ? resolvedSize : undefined;
      return <Spacer key={key} size={size} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'Divider': {
      const resolvedColor = rv((n as Record<string, unknown>).color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      const resolvedThickness = rv((n as Record<string, unknown>).thickness);
      const thickness = typeof resolvedThickness === 'number' || typeof resolvedThickness === 'string'
        ? resolvedThickness : undefined;
      return <Divider key={key} color={color} thickness={thickness} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'ProgressBar': {
      const resolvedValue = rv((n as Record<string, unknown>).value);
      const value = typeof resolvedValue === 'number' ? resolvedValue : 0;
      const resolvedMax = rv((n as Record<string, unknown>).max);
      const max = typeof resolvedMax === 'number' ? resolvedMax : 100;
      const resolvedColor = rv((n as Record<string, unknown>).color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return <ProgressBar key={key} value={value} max={max} color={color} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'Badge': {
      const label = resolveTextValue((n as Record<string, unknown>).label, ctx.state, ctx.locals);
      const resolvedColor = rv((n as Record<string, unknown>).color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return <Badge key={key} label={label} color={color} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'Chip': {
      const label = resolveTextValue((n as Record<string, unknown>).label, ctx.state, ctx.locals);
      const resolvedColor = rv((n as Record<string, unknown>).color);
      const color = typeof resolvedColor === 'string' ? resolvedColor : undefined;
      return <Chip key={key} label={label} color={color} style={cssStyle} hoverStyle={cssHoverStyle} />;
    }

    case 'Button': {
      const label = resolveTextValue((n as Record<string, unknown>).label, ctx.state, ctx.locals);
      const actionVal = (n as Record<string, unknown>).action;
      const action = typeof actionVal === 'string' ? actionVal : '';
      const resolvedDisabled = rv((n as Record<string, unknown>).disabled);
      const disabled = typeof resolvedDisabled === 'boolean' ? resolvedDisabled : undefined;
      return (
        <Button
          key={key}
          label={label}
          action={action}
          onAction={ctx.onAction}
          disabled={disabled}
          style={cssStyle}
          hoverStyle={cssHoverStyle}
        />
      );
    }

    case 'Toggle': {
      const resolvedValue = rv((n as Record<string, unknown>).value);
      const value = typeof resolvedValue === 'boolean' ? resolvedValue : false;
      const onToggleVal = (n as Record<string, unknown>).onToggle;
      const onToggle = typeof onToggleVal === 'string' ? onToggleVal : '';
      const resolvedDisabled = rv((n as Record<string, unknown>).disabled);
      const disabled = typeof resolvedDisabled === 'boolean' ? resolvedDisabled : undefined;
      return (
        <Toggle
          key={key}
          value={value}
          onToggle={onToggle}
          onAction={ctx.onAction}
          disabled={disabled}
          style={cssStyle}
          hoverStyle={cssHoverStyle}
        />
      );
    }

    case 'Accordion': {
      const items = resolveAccordionItems(n, ctx, key);
      const allowMultiple = (n as Record<string, unknown>).allowMultiple === true;
      const defaultExpanded = Array.isArray((n as Record<string, unknown>).defaultExpanded)
        ? ((n as Record<string, unknown>).defaultExpanded as unknown[]).filter(
            (value): value is string => typeof value === 'string',
          )
        : undefined;

      return (
        <Accordion
          key={key}
          items={items}
          allowMultiple={allowMultiple}
          defaultExpanded={defaultExpanded}
          style={cssStyle}
          hoverStyle={cssHoverStyle}
        />
      );
    }

    case 'Tabs': {
      const tabs = resolveTabsItems(n, ctx, key);
      const defaultTab = typeof (n as Record<string, unknown>).defaultTab === 'string'
        ? (n as Record<string, unknown>).defaultTab as string
        : undefined;

      return (
        <Tabs
          key={key}
          tabs={tabs}
          defaultTab={defaultTab}
          style={cssStyle}
          hoverStyle={cssHoverStyle}
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
 * This is a low-level API. Callers must validate the card and any merged
 * runtime state before calling renderTree directly.
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
  responsive: { compact: boolean; medium?: boolean } = { compact: false, medium: false },
  fragments?: Record<string, unknown>,
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
    fragments,
    fragmentStack: [],
    iconResolver,
    onAction,
    onError,
    limits,
    responsive: {
      compact: responsive.compact,
      medium: responsive.medium ?? responsive.compact,
    },
  };
  return renderNode(rootNode, ctx, 'root');
}
