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

import { ALL_COMPONENT_TYPES } from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import {
  type TraversableNode,
  type TraversalContext,
  traverseCard,
} from './traverse.js';

// ---------------------------------------------------------------------------
// Required fields per component type
// ---------------------------------------------------------------------------

/**
 * Mapping from component type to the list of required field names.
 * Layout nodes (Box, Row, Column, Stack, Grid) and structural nodes
 * (Divider, Spacer) have no required fields.
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  Text: ['content'],
  Image: ['src'],
  ProgressBar: ['value', 'max'],
  Avatar: ['src'],
  Icon: ['name'],
  Badge: ['label'],
  Chip: ['label'],
  Button: ['label', 'action'],
  Toggle: ['value', 'onToggle'],
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
function validateForLoop(
  children: Record<string, unknown>,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // `for` must be a string
  if (typeof children['for'] !== 'string') {
    errors.push(
      createError(
        'INVALID_VALUE',
        'ForLoop "for" must be a string.',
        `${path}.children.for`,
      ),
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
    !('type' in template)
  ) {
    errors.push(
      createError(
        'INVALID_VALUE',
        'ForLoop "template" must be an object with a "type" property.',
        `${path}.children.template`,
      ),
    );
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Per-node validation
// ---------------------------------------------------------------------------

/**
 * Validate a single node's type and required fields.
 */
function validateNode(
  node: TraversableNode,
  context: TraversalContext,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { path } = context;

  // 1. Unknown node type
  if (!KNOWN_TYPES.has(node.type)) {
    errors.push(
      createError(
        'UNKNOWN_NODE_TYPE',
        `Unknown node type "${node.type}".`,
        path,
      ),
    );
    // Cannot validate fields for an unknown type; return early.
    return errors;
  }

  // 2. Required field validation
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
    errors.push(
      ...validateForLoop(
        node.children as unknown as Record<string, unknown>,
        path,
      ),
    );
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
): ValidationError[] {
  const errors: ValidationError[] = [];

  traverseCard(views, (node: TraversableNode, context: TraversalContext) => {
    errors.push(...validateNode(node, context));
  });

  return errors;
}
