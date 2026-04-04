/**
 * @safe-ugc-ui/validator — Raw Renderable Tree Walk
 *
 * Walks card trees before fragment expansion so validators can inspect
 * `$use` wrappers and fragment definitions directly.
 */

import {
  getEmbeddedRenderables,
  isFragmentUseLike,
  isTraversableNode,
} from './traverse.js';

export interface RenderableWalkContext {
  path: string;
  inFragments: boolean;
}

type RenderableWalker = (
  node: Record<string, unknown>,
  context: RenderableWalkContext,
) => void;

function isForLoopLike(value: unknown): value is { template: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'for' in value &&
    'in' in value &&
    'template' in value
  );
}

function walkRenderableNode(
  node: Record<string, unknown>,
  path: string,
  inFragments: boolean,
  visitor: RenderableWalker,
): void {
  visitor(node, { path, inFragments });

  if (!isTraversableNode(node)) {
    return;
  }

  const children = node.children;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!isTraversableNode(child) && !isFragmentUseLike(child)) {
        continue;
      }
      walkRenderableNode(
        child as Record<string, unknown>,
        `${path}.children[${i}]`,
        inFragments,
        visitor,
      );
    }
  }

  if (isForLoopLike(children)) {
    const template = children.template;
    if (isTraversableNode(template) || isFragmentUseLike(template)) {
      walkRenderableNode(
        template as Record<string, unknown>,
        `${path}.children.template`,
        inFragments,
        visitor,
      );
    }
  }

  for (const entry of getEmbeddedRenderables(node)) {
    walkRenderableNode(
      entry.renderable as Record<string, unknown>,
      `${path}.${entry.pathSuffix}`,
      inFragments,
      visitor,
    );
  }
}

export function walkRenderableCard(
  views: Record<string, unknown>,
  fragments: Record<string, unknown> | undefined,
  visitor: RenderableWalker,
): void {
  for (const [viewName, rootNode] of Object.entries(views)) {
    if (!isTraversableNode(rootNode) && !isFragmentUseLike(rootNode)) {
      continue;
    }

    walkRenderableNode(
      rootNode as Record<string, unknown>,
      `views.${viewName}`,
      false,
      visitor,
    );
  }

  if (!fragments) {
    return;
  }

  for (const [fragmentName, fragmentRoot] of Object.entries(fragments)) {
    if (!isTraversableNode(fragmentRoot) && !isFragmentUseLike(fragmentRoot)) {
      continue;
    }

    walkRenderableNode(
      fragmentRoot as Record<string, unknown>,
      `fragments.${fragmentName}`,
      true,
      visitor,
    );
  }
}
