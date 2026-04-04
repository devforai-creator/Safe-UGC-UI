/**
 * @safe-ugc-ui/validator — Tree Traversal
 *
 * Provides utilities for walking the UGC card tree, tracking:
 *   - path:      JSON-pointer-like location string
 *   - depth:     nesting level
 *   - parentType: the type of the parent node (for position/overflow rules)
 *   - loopDepth: nesting level of for-loops
 *   - overflowAutoAncestor: whether an ancestor has overflow:auto
 *   - stackDepth: nesting level of Stack components
 *
 * The traversal is generic: it calls a visitor function on each node,
 * allowing different validators to collect different data.
 */

// ---------------------------------------------------------------------------
// Context passed to visitor callbacks
// ---------------------------------------------------------------------------

/**
 * Contextual information available at each node during traversal.
 */
export interface TraversalContext {
  /** JSON-pointer-like path, e.g. "views.Main.children[0].children[1]" */
  path: string;

  /** Nesting depth (root node = 0). */
  depth: number;

  /** The `type` of the immediate parent node, or null for root-level nodes. */
  parentType: string | null;

  /** Current for-loop nesting depth (0 = no loop). */
  loopDepth: number;

  /** True if any ancestor has `overflow: auto` in its style. */
  overflowAutoAncestor: boolean;

  /** Current Stack nesting depth (0 = not inside a Stack). */
  stackDepth: number;
}

// ---------------------------------------------------------------------------
// Node shape (loose — validated elsewhere)
// ---------------------------------------------------------------------------

/**
 * Minimal shape expected for a node during traversal.
 * We use a loose type because traversal runs after schema validation,
 * but the node might have extra or unexpected fields.
 */
export interface TraversableNode {
  type: string;
  children?: TraversableRenderable[] | ForLoopLike;
  style?: Record<string, unknown>;
  responsive?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FragmentUseLike {
  $use: string;
  $if?: unknown;
  [key: string]: unknown;
}

export type TraversableRenderable = TraversableNode | FragmentUseLike;

export interface EmbeddedRenderableEntry {
  pathSuffix: string;
  renderable: TraversableRenderable;
}

interface ForLoopLike {
  for: string;
  in: string;
  template: TraversableRenderable;
}

// ---------------------------------------------------------------------------
// Visitor
// ---------------------------------------------------------------------------

/**
 * A visitor function called for every node in the tree.
 * Return `false` to skip traversing into this node's children.
 */
export type NodeVisitor = (
  node: TraversableNode,
  context: TraversalContext,
) => void | false;

export type StyleResolver = (
  node: TraversableNode,
) => Record<string, unknown> | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isForLoop(
  children: unknown,
): children is ForLoopLike {
  return (
    typeof children === 'object' &&
    children !== null &&
    'for' in children &&
    'in' in children &&
    'template' in children
  );
}

export function isTraversableNode(value: unknown): value is TraversableNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

export function isFragmentUseLike(value: unknown): value is FragmentUseLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$use' in value &&
    typeof (value as Record<string, unknown>).$use === 'string'
  );
}

export function getEmbeddedRenderables(
  node: TraversableNode,
): EmbeddedRenderableEntry[] {
  const entries: EmbeddedRenderableEntry[] = [];

  if (node.type === 'Accordion' && Array.isArray(node.items)) {
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      if (
        item == null ||
        typeof item !== 'object' ||
        Array.isArray(item)
      ) {
        continue;
      }

      const content = (item as Record<string, unknown>).content;
      if (isTraversableNode(content) || isFragmentUseLike(content)) {
        entries.push({
          pathSuffix: `items[${i}].content`,
          renderable: content,
        });
      }
    }
  }

  return entries;
}

function resolveRenderableNode(
  node: TraversableRenderable,
  fragments?: Record<string, unknown>,
  fragmentStack: string[] = [],
): TraversableNode | null {
  if (isTraversableNode(node)) {
    return node;
  }

  if (!isFragmentUseLike(node) || !fragments) {
    return null;
  }

  // Fragment definitions are validated separately and may not nest `$use`.
  // Skip expansion here so invalid cards cannot recurse indefinitely.
  if (fragmentStack.length > 0 || fragmentStack.includes(node.$use)) {
    return null;
  }

  const target = fragments[node.$use];
  return isTraversableNode(target) ? target : null;
}

function hasOverflowAuto(style: Record<string, unknown> | undefined): boolean {
  return style?.overflow === 'auto';
}

// ---------------------------------------------------------------------------
// traverseNode
// ---------------------------------------------------------------------------

/**
 * Recursively traverse a single node and its descendants.
 */
export function traverseNode(
  node: TraversableRenderable,
  context: TraversalContext,
  visitor: NodeVisitor,
  styleResolver?: StyleResolver,
  fragments?: Record<string, unknown>,
  fragmentStack: string[] = [],
): void {
  const resolvedNode = resolveRenderableNode(node, fragments, fragmentStack);
  if (!resolvedNode) {
    return;
  }

  const nextFragmentStack =
    isFragmentUseLike(node) ? [...fragmentStack, node.$use] : fragmentStack;

  const result = visitor(resolvedNode, context);

  // If visitor returns false, skip children.
  if (result === false) {
    return;
  }

  const nextStackDepth =
    resolvedNode.type === 'Stack' ? context.stackDepth + 1 : context.stackDepth;
  const nextOverflowAuto =
    context.overflowAutoAncestor || hasOverflowAuto(styleResolver ? styleResolver(resolvedNode) : resolvedNode.style);

  const children = resolvedNode.children;
  if (children != null) {
    if (isForLoop(children)) {
      // ForLoop: traverse the template node
      const childCtx: TraversalContext = {
        path: `${context.path}.children.template`,
        depth: context.depth + 1,
        parentType: resolvedNode.type,
        loopDepth: context.loopDepth + 1,
        overflowAutoAncestor: nextOverflowAuto,
        stackDepth: nextStackDepth,
      };
      traverseNode(children.template, childCtx, visitor, styleResolver, fragments, nextFragmentStack);
    } else if (Array.isArray(children)) {
      // Array of child nodes
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isTraversableNode(child) || isFragmentUseLike(child)) {
          const childCtx: TraversalContext = {
            path: `${context.path}.children[${i}]`,
            depth: context.depth + 1,
            parentType: resolvedNode.type,
            loopDepth: context.loopDepth,
            overflowAutoAncestor: nextOverflowAuto,
            stackDepth: nextStackDepth,
          };
          traverseNode(child, childCtx, visitor, styleResolver, fragments, nextFragmentStack);
        }
      }
    }
  }

  for (const entry of getEmbeddedRenderables(resolvedNode)) {
    const embeddedCtx: TraversalContext = {
      path: `${context.path}.${entry.pathSuffix}`,
      depth: context.depth + 1,
      parentType: resolvedNode.type,
      loopDepth: context.loopDepth,
      overflowAutoAncestor: nextOverflowAuto,
      stackDepth: nextStackDepth,
    };
    traverseNode(
      entry.renderable,
      embeddedCtx,
      visitor,
      styleResolver,
      fragments,
      nextFragmentStack,
    );
  }
}

// ---------------------------------------------------------------------------
// traverseCard
// ---------------------------------------------------------------------------

/**
 * Traverse all nodes in every view of a card.
 *
 * @param views - The `views` object from a UGCCard (mapping view names to root nodes).
 * @param visitor - Called for every node in every view.
 */
export function traverseCard(
  views: Record<string, unknown>,
  visitor: NodeVisitor,
  styleResolver?: StyleResolver,
  fragments?: Record<string, unknown>,
  pathPrefix: string = 'views',
): void {
  for (const [viewName, rootNode] of Object.entries(views)) {
    if (!isTraversableNode(rootNode) && !isFragmentUseLike(rootNode)) {
      continue;
    }

    const context: TraversalContext = {
      path: `${pathPrefix}.${viewName}`,
      depth: 0,
      parentType: null,
      loopDepth: 0,
      overflowAutoAncestor: false,
      stackDepth: 0,
    };

    traverseNode(rootNode, context, visitor, styleResolver, fragments);
  }
}
