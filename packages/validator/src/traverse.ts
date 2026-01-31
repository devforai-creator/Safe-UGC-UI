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
  children?: TraversableNode[] | ForLoopLike;
  style?: Record<string, unknown>;
  condition?: unknown;
  [key: string]: unknown;
}

interface ForLoopLike {
  for: string;
  in: string;
  template: TraversableNode;
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
  node: TraversableNode,
  context: TraversalContext,
  visitor: NodeVisitor,
): void {
  const result = visitor(node, context);

  // If visitor returns false, skip children.
  if (result === false) {
    return;
  }

  const children = node.children;
  if (children == null) {
    return;
  }

  const nextStackDepth =
    node.type === 'Stack' ? context.stackDepth + 1 : context.stackDepth;
  const nextOverflowAuto =
    context.overflowAutoAncestor || hasOverflowAuto(node.style);

  if (isForLoop(children)) {
    // ForLoop: traverse the template node
    const childCtx: TraversalContext = {
      path: `${context.path}.children.template`,
      depth: context.depth + 1,
      parentType: node.type,
      loopDepth: context.loopDepth + 1,
      overflowAutoAncestor: nextOverflowAuto,
      stackDepth: nextStackDepth,
    };
    traverseNode(children.template, childCtx, visitor);
  } else if (Array.isArray(children)) {
    // Array of child nodes
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child && typeof child === 'object' && 'type' in child) {
        const childCtx: TraversalContext = {
          path: `${context.path}.children[${i}]`,
          depth: context.depth + 1,
          parentType: node.type,
          loopDepth: context.loopDepth,
          overflowAutoAncestor: nextOverflowAuto,
          stackDepth: nextStackDepth,
        };
        traverseNode(child as TraversableNode, childCtx, visitor);
      }
    }
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
): void {
  for (const [viewName, rootNode] of Object.entries(views)) {
    if (
      rootNode == null ||
      typeof rootNode !== 'object' ||
      !('type' in rootNode)
    ) {
      continue;
    }

    const context: TraversalContext = {
      path: `views.${viewName}`,
      depth: 0,
      parentType: null,
      loopDepth: 0,
      overflowAutoAncestor: false,
      stackDepth: 0,
    };

    traverseNode(rootNode as TraversableNode, context, visitor);
  }
}
