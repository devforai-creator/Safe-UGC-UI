/**
 * @safe-ugc-ui/validator — Value Type Validation
 *
 * Validates per-property $ref permission rules based on spec
 * section 4.5 value type table.
 *
 * | Property Type     | Literal | $ref |
 * |-------------------|---------|------|
 * | Image.src         |   yes   | yes  |
 * | Avatar.src        |   yes   | yes  |
 * | Icon.name         |   yes   | yes  |
 * | Text.content      |   yes   | yes  |
 * | Color properties  |   yes   | yes  |
 * | Size properties   |   yes   | yes  |
 * | position          |   yes   |  no  |
 * | transform         |   yes   |  no  |
 * | gradient          |   yes   |  no  |
 *
 * Additionally, several style properties must always be static
 * (no $ref): overflow, border*, boxShadow, zIndex,
 * and position offset properties (top/right/bottom/left).
 */

import { type ValidationError, createError } from './result.js';
import {
  type TraversableNode,
  type TraversalContext,
  traverseCard,
} from './traverse.js';

// ---------------------------------------------------------------------------
// Style properties that must always be static (no $ref)
// ---------------------------------------------------------------------------

/**
 * Style properties where any dynamic binding ($ref) is forbidden.
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
      if (
        typeof value === 'object' &&
        value !== null &&
        '$ref' in value &&
        typeof (value as Record<string, unknown>).$ref === 'string'
      ) {
        errors.push(
          createError(
            'DYNAMIC_NOT_ALLOWED',
            `Style property "${prop}" must be a static literal; $ref is not allowed.`,
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
 * respects its allowed value types ($ref permissions).
 *
 * @param views - The `views` object from a UGCCard.
 * @returns An array of validation errors (empty if all values are valid).
 */
export function validateValueTypes(
  views: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  traverseCard(views, (node: TraversableNode, ctx: TraversalContext) => {
    validateNodeStyle(node, ctx, errors);
  });

  return errors;
}
