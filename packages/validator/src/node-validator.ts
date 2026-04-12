/**
 * @safe-ugc-ui/validator — Node Validator
 *
 * Validates component type-specific requirements for each node in the card tree.
 *
 * For every node encountered during traversal:
 *   1. Rejects unknown node types not in ALL_COMPONENT_TYPES.
 *   2. Checks that required fields exist for each component type.
 *   4. Validates ForLoop structure when children use `for`/`in`/`template`.
 */

import { ALL_COMPONENT_TYPES, MAX_INTERACTIVE_ITEMS } from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { walkRenderableCard } from './renderable-walk.js';
import { isFragmentUseLike, type TraversableNode, type TraversalContext } from './traverse.js';

// ---------------------------------------------------------------------------
// Required fields per component type
// ---------------------------------------------------------------------------

/**
 * Mapping from component type to the list of required field names.
 * Layout nodes (Box, Row, Column, Stack, Grid) plus structural/display
 * nodes without mandatory fields (Divider, Spacer) are omitted.
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  Image: ['src'],
  ProgressBar: ['value', 'max'],
  Avatar: ['src'],
  Icon: ['name'],
  Badge: ['label'],
  Chip: ['label'],
  Button: ['label', 'action'],
  Toggle: ['value', 'onToggle'],
  Accordion: ['items'],
  Tabs: ['tabs'],
  Switch: ['value', 'cases'],
};

// ---------------------------------------------------------------------------
// Set of known component types for fast lookup
// ---------------------------------------------------------------------------

const KNOWN_TYPES: ReadonlySet<string> = new Set(ALL_COMPONENT_TYPES);

// ---------------------------------------------------------------------------
// ForLoop validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given value looks like a ForLoop structure
 * (has `for`, `in`, and `template` properties).
 */
function looksLikeForLoop(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'for' in value &&
    'in' in value &&
    'template' in value
  );
}

/**
 * Validate the structural integrity of a ForLoop children object.
 */
function validateForLoop(children: Record<string, unknown>, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // `for` must be a string
  if (typeof children['for'] !== 'string') {
    errors.push(
      createError('INVALID_VALUE', 'ForLoop "for" must be a string.', `${path}.children.for`),
    );
  }

  // `in` must be a string starting with `$`
  const inValue = children['in'];
  if (typeof inValue !== 'string' || !inValue.startsWith('$')) {
    errors.push(
      createError(
        'INVALID_VALUE',
        'ForLoop "in" must be a string starting with "$".',
        `${path}.children.in`,
      ),
    );
  }

  // `template` must be an object with a `type` property
  const template = children['template'];
  if (
    typeof template !== 'object' ||
    template === null ||
    (!('type' in template) && !isFragmentUseLike(template))
  ) {
    errors.push(
      createError(
        'INVALID_VALUE',
        'ForLoop "template" must be an object with a "type" property or "$use" reference.',
        `${path}.children.template`,
      ),
    );
  }

  return errors;
}

function collectUniqueInteractiveItemIds(
  items: unknown[],
  nodeType: 'Accordion' | 'Tabs',
  path: string,
  errors: ValidationError[],
): Set<string> {
  const itemIds = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const itemId = (item as Record<string, unknown>).id;
    if (typeof itemId !== 'string' || itemId.length === 0) {
      continue;
    }

    if (itemIds.has(itemId)) {
      errors.push(
        createError(
          'INVALID_VALUE',
          `"${nodeType}" item ids must be unique. Duplicate id "${itemId}".`,
          `${path}[${i}].id`,
        ),
      );
      continue;
    }

    itemIds.add(itemId);
  }

  return itemIds;
}

// ---------------------------------------------------------------------------
// Per-node validation
// ---------------------------------------------------------------------------

/**
 * Validate a single node's type and required fields.
 */
function validateNode(node: TraversableNode, context: TraversalContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { path } = context;

  // 1. Unknown node type
  if (!KNOWN_TYPES.has(node.type)) {
    errors.push(createError('UNKNOWN_NODE_TYPE', `Unknown node type "${node.type}".`, path));
    // Cannot validate fields for an unknown type; return early.
    return errors;
  }

  // 2. Required field validation
  if (node.type === 'Text') {
    const hasContent = 'content' in node && (node as Record<string, unknown>).content !== undefined;
    const hasSpans = 'spans' in node && (node as Record<string, unknown>).spans !== undefined;

    if (!hasContent && !hasSpans) {
      errors.push(
        createError(
          'MISSING_FIELD',
          '"Text" node must define either "content" or "spans".',
          `${path}.content`,
        ),
      );
    }

    if (hasContent && hasSpans) {
      errors.push(
        createError('INVALID_VALUE', '"Text" node cannot define both "content" and "spans".', path),
      );
    }
  }

  const requiredFields = REQUIRED_FIELDS[node.type];
  if (requiredFields && requiredFields.length > 0) {
    // Check each required field on the node itself (v2 flattening).
    for (const field of requiredFields) {
      if (!(field in node) || (node as Record<string, unknown>)[field] === undefined) {
        errors.push(
          createError(
            'MISSING_FIELD',
            `"${node.type}" node is missing required field "${field}".`,
            `${path}.${field}`,
          ),
        );
      }
    }
  }

  // 4. ForLoop structure validation
  if (node.children != null && looksLikeForLoop(node.children)) {
    errors.push(...validateForLoop(node.children as unknown as Record<string, unknown>, path));
  }

  if (node.type === 'Accordion') {
    const items = Array.isArray(node.items) ? node.items : undefined;
    if (items) {
      if (items.length > MAX_INTERACTIVE_ITEMS) {
        errors.push(
          createError(
            'INVALID_VALUE',
            `"Accordion" node may define at most ${MAX_INTERACTIVE_ITEMS} items.`,
            `${path}.items`,
          ),
        );
      }

      const itemIds = collectUniqueInteractiveItemIds(items, 'Accordion', `${path}.items`, errors);

      if (Array.isArray(node.defaultExpanded)) {
        if (node.allowMultiple !== true && node.defaultExpanded.length > 1) {
          errors.push(
            createError(
              'INVALID_VALUE',
              '"Accordion" cannot define multiple defaultExpanded ids unless "allowMultiple" is true.',
              `${path}.defaultExpanded`,
            ),
          );
        }

        for (let i = 0; i < node.defaultExpanded.length; i++) {
          const itemId = node.defaultExpanded[i];
          if (typeof itemId !== 'string' || !itemIds.has(itemId)) {
            errors.push(
              createError(
                'INVALID_VALUE',
                `"Accordion" defaultExpanded id "${String(itemId)}" was not found in items.`,
                `${path}.defaultExpanded[${i}]`,
              ),
            );
          }
        }
      }
    }
  }

  if (node.type === 'Tabs') {
    const tabs = Array.isArray(node.tabs) ? node.tabs : undefined;
    if (tabs) {
      if (tabs.length > MAX_INTERACTIVE_ITEMS) {
        errors.push(
          createError(
            'INVALID_VALUE',
            `"Tabs" node may define at most ${MAX_INTERACTIVE_ITEMS} tabs.`,
            `${path}.tabs`,
          ),
        );
      }

      const tabIds = collectUniqueInteractiveItemIds(tabs, 'Tabs', `${path}.tabs`, errors);

      if ('defaultTab' in node) {
        const defaultTab = (node as Record<string, unknown>).defaultTab;
        if (typeof defaultTab !== 'string' || !tabIds.has(defaultTab)) {
          errors.push(
            createError(
              'INVALID_VALUE',
              `"Tabs" defaultTab "${String(defaultTab)}" was not found in tabs.`,
              `${path}.defaultTab`,
            ),
          );
        }
      }
    }
  }

  if (node.type === 'Switch') {
    const rawCases = node.cases;
    if (
      rawCases == null ||
      typeof rawCases !== 'object' ||
      Array.isArray(rawCases) ||
      Object.keys(rawCases).length === 0
    ) {
      errors.push(
        createError(
          'INVALID_VALUE',
          '"Switch" node must define at least one case.',
          `${path}.cases`,
        ),
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate all nodes in every view of a card.
 *
 * Uses `traverseCard()` to visit every node and checks:
 *   - Node type is a known component type.
 *   - Required fields are present for the given component type.
 *   - ForLoop children have valid `for`, `in`, and `template` fields.
 *
 * @param views - The `views` object from a UGCCard.
 * @returns An array of validation errors (empty if all nodes are valid).
 */
export function validateNodes(
  views: Record<string, unknown>,
  fragments?: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  walkRenderableCard(views, fragments, (node, context) => {
    if (!('type' in node) || typeof node.type !== 'string') {
      return;
    }

    errors.push(
      ...validateNode(node as TraversableNode, {
        path: context.path,
        depth: 0,
        parentType: null,
        loopDepth: 0,
        overflowAutoAncestor: false,
        stackDepth: 0,
      } satisfies TraversalContext),
    );
  });

  return errors;
}
