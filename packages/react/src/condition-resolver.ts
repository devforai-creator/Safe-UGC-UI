/**
 * @safe-ugc-ui/react — Condition Resolver
 *
 * Evaluates the small declarative condition AST used by node-level `$if`.
 * This intentionally does not support general expressions or computation.
 */

import { MAX_CONDITION_DEPTH, isRef } from '@safe-ugc-ui/types';
import { resolveRef } from './state-resolver.js';

type ConditionOperand = string | number | boolean | null | { $ref: string };

function resolveOperand(
  operand: ConditionOperand,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
): string | number | boolean | null | undefined {
  if (isRef(operand)) {
    const resolved = resolveRef(operand.$ref, state, locals);
    if (
      resolved === null ||
      typeof resolved === 'string' ||
      typeof resolved === 'number' ||
      typeof resolved === 'boolean'
    ) {
      return resolved;
    }
    return undefined;
  }

  return operand;
}

function compareValues(
  op: string,
  left: string | number | boolean | null | undefined,
  right: string | number | boolean | null | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }

  if (op === 'eq') return left === right;
  if (op === 'ne') return left !== right;

  if (left === null || right === null) {
    return false;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (
    (typeof left !== 'number' && typeof left !== 'string') ||
    (typeof right !== 'number' && typeof right !== 'string')
  ) {
    return false;
  }

  switch (op) {
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: unknown,
  state: Record<string, unknown>,
  locals?: Record<string, unknown>,
  depth: number = 1,
): boolean {
  if (depth > MAX_CONDITION_DEPTH) {
    return false;
  }

  if (typeof condition === 'boolean') {
    return condition;
  }

  if (isRef(condition)) {
    return resolveRef(condition.$ref, state, locals) === true;
  }

  if (typeof condition !== 'object' || condition === null || Array.isArray(condition)) {
    return false;
  }

  const conditionObj = condition as Record<string, unknown>;
  switch (conditionObj.op) {
    case 'not':
      return !evaluateCondition(conditionObj.value, state, locals, depth + 1);
    case 'and':
      return (
        Array.isArray(conditionObj.values) &&
        conditionObj.values.every((value) => evaluateCondition(value, state, locals, depth + 1))
      );
    case 'or':
      return (
        Array.isArray(conditionObj.values) &&
        conditionObj.values.some((value) => evaluateCondition(value, state, locals, depth + 1))
      );
    case 'eq':
    case 'ne':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return compareValues(
        conditionObj.op,
        resolveOperand(conditionObj.left as ConditionOperand, state, locals),
        resolveOperand(conditionObj.right as ConditionOperand, state, locals),
      );
    default:
      return false;
  }
}
