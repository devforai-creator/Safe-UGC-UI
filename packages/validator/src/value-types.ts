/**
 * @safe-ugc-ui/validator — Value Type Validation
 *
 * Validates per-property $ref / $expr permission rules based on spec
 * section 4.5 value type table.
 *
 * | Property Type     | Literal | $ref | $expr |
 * |-------------------|---------|------|-------|
 * | Image.src         |   yes   | yes  |  no   |
 * | Avatar.src        |   yes   | yes  |  no   |
 * | Icon.name         |   yes   |  no  |  no   |
 * | Text.content      |   yes   | yes  | yes   |
 * | Color properties  |   yes   | yes  | yes   |
 * | Size properties   |   yes   | yes  | yes   |
 * | position          |   yes   |  no  |  no   |
 * | transform         |   yes   |  no  |  no   |
 * | gradient          |   yes   |  no  |  no   |
 *
 * Additionally, several style properties must always be static
 * (no $ref or $expr): overflow, border*, boxShadow, zIndex,
 * and position offset properties (top/right/bottom/left).
 */

import { isRef, isExpr } from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import {
  type TraversableNode,
  type TraversalContext,
  traverseCard,
} from './traverse.js';

// ---------------------------------------------------------------------------
// Style properties that must always be static (no $ref / $expr)
// ---------------------------------------------------------------------------

/**
 * Style properties where any dynamic binding ($ref or $expr) is forbidden.
 * These use the `DYNAMIC_NOT_ALLOWED` error code.
 */
const STATIC_ONLY_STYLE_PROPERTIES: ReadonlySet<string> = new Set([
  // Position / layout
  'position',
  'top',
  'right',
  'bottom',
  'left',

  // Transform
  'transform',

  // Gradient
  'backgroundGradient',

  // Overflow
  'overflow',

  // Borders
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',

  // Shadow
  'boxShadow',

  // Stacking
  'zIndex',
]);

// ---------------------------------------------------------------------------
// Per-node field validation
// ---------------------------------------------------------------------------

/**
 * Validate component fields according to the value type table.
 */
function validateNodeFields(
  node: TraversableNode,
  ctx: TraversalContext,
  errors: ValidationError[],
): void {
  const nodeType = node.type;

  // Image.src / Avatar.src — $ref allowed, $expr forbidden
  if (nodeType === 'Image' || nodeType === 'Avatar') {
    const src = (node as Record<string, unknown>).src;
    if (src !== undefined && isExpr(src)) {
      errors.push(
        createError(
          'EXPR_NOT_ALLOWED',
          `${nodeType}.src does not allow $expr bindings.`,
          `${ctx.path}.src`,
        ),
      );
    }
  }

  // Icon.name — neither $ref nor $expr allowed
  if (nodeType === 'Icon') {
    const name = (node as Record<string, unknown>).name;
    if (name !== undefined && isRef(name)) {
      errors.push(
        createError(
          'REF_NOT_ALLOWED',
          'Icon.name does not allow $ref bindings.',
          `${ctx.path}.name`,
        ),
      );
    }
    if (name !== undefined && isExpr(name)) {
      errors.push(
        createError(
          'EXPR_NOT_ALLOWED',
          'Icon.name does not allow $expr bindings.',
          `${ctx.path}.name`,
        ),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Per-node style validation
// ---------------------------------------------------------------------------

/**
 * Validate the `style` of a node according to the value type table.
 */
function validateNodeStyle(
  node: TraversableNode,
  ctx: TraversalContext,
  errors: ValidationError[],
): void {
  const style = node.style;
  if (!style) {
    return;
  }

  for (const [prop, value] of Object.entries(style)) {
    if (value === undefined) {
      continue;
    }

    if (STATIC_ONLY_STYLE_PROPERTIES.has(prop)) {
      if (isRef(value) || isExpr(value)) {
        errors.push(
          createError(
            'DYNAMIC_NOT_ALLOWED',
            `Style property "${prop}" must be a static literal; $ref and $expr are not allowed.`,
            `${ctx.path}.style.${prop}`,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk all nodes in the card and validate that each field's value
 * respects its allowed value types ($ref / $expr permissions).
 *
 * @param views - The `views` object from a UGCCard.
 * @returns An array of validation errors (empty if all values are valid).
 */
export function validateValueTypes(
  views: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  traverseCard(views, (node: TraversableNode, ctx: TraversalContext) => {
    validateNodeFields(node, ctx, errors);
    validateNodeStyle(node, ctx, errors);
  });

  return errors;
}
