/**
 * @safe-ugc-ui/validator — Condition Validator
 *
 * Validates node-level `$if` conditions that are structurally accepted by the
 * schema but still need semantic guardrails such as maximum nesting depth.
 */

import { MAX_CONDITION_DEPTH, isRef } from '@safe-ugc-ui/types';

import { type ValidationError, createError } from './result.js';
import { walkRenderableCard } from './renderable-walk.js';

function validateConditionDepth(
  condition: unknown,
  path: string,
  errors: ValidationError[],
  depth: number = 1,
): void {
  if (depth > MAX_CONDITION_DEPTH) {
    errors.push(
      createError(
        'CONDITION_DEPTH_EXCEEDED',
        `$if condition exceeds maximum depth of ${MAX_CONDITION_DEPTH} at "${path}"`,
        path,
      ),
    );
    return;
  }

  if (typeof condition === 'boolean' || isRef(condition)) {
    return;
  }

  if (typeof condition !== 'object' || condition === null || Array.isArray(condition)) {
    return;
  }

  const conditionObj = condition as Record<string, unknown>;
  const op = conditionObj.op;
  if (op === 'not') {
    validateConditionDepth(conditionObj.value, `${path}.value`, errors, depth + 1);
    return;
  }

  if ((op === 'and' || op === 'or') && Array.isArray(conditionObj.values)) {
    for (let i = 0; i < conditionObj.values.length; i++) {
      validateConditionDepth(conditionObj.values[i], `${path}.values[${i}]`, errors, depth + 1);
    }
  }
}

export function validateConditions(
  views: Record<string, unknown>,
  fragments?: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  walkRenderableCard(views, fragments, (node, ctx) => {
    if ('$if' in node) {
      validateConditionDepth(node.$if, `${ctx.path}.$if`, errors);
    }
  });

  return errors;
}
