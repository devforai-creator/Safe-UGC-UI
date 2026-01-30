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
// Per-node prop validation
// ---------------------------------------------------------------------------

/**
 * Validate the `props` of a node according to the value type table.
 */
function validateNodeProps(
  node: TraversableNode,
  ctx: TraversalContext,
  errors: ValidationError[],
): void {
  const props = node.props;
  if (!props) {
    return;
  }

  const nodeType = node.type;

  // Image.src / Avatar.src — $ref allowed, $expr forbidden
  if ((nodeType === 'Image' || nodeType === 'Avatar') && props.src !== undefined) {
    if (isExpr(props.src)) {
      errors.push(
        createError(
          'EXPR_NOT_ALLOWED',
          `${nodeType}.src does not allow $expr bindings.`,
          `${ctx.path}.props.src`,
        ),
      );
    }
  }

  // Icon.name — neither $ref nor $expr allowed
  if (nodeType === 'Icon' && props.name !== undefined) {
    if (isRef(props.name)) {
      errors.push(
        createError(
          'REF_NOT_ALLOWED',
          'Icon.name does not allow $ref bindings.',
          `${ctx.path}.props.name`,
        ),
      );
    }
    if (isExpr(props.name)) {
      errors.push(
        createError(
          'EXPR_NOT_ALLOWED',
          'Icon.name does not allow $expr bindings.',
          `${ctx.path}.props.name`,
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
 * Walk all nodes in the card and validate that each property's value
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
    validateNodeProps(node, ctx, errors);
    validateNodeStyle(node, ctx, errors);
  });

  return errors;
}
