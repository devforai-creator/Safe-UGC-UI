/**
 * @safe-ugc-ui/types — Condition System
 *
 * Defines a small declarative condition AST used by node-level `$if`.
 * This is intentionally narrower than a general expression language.
 */

import { z } from 'zod';
import { refSchema } from './values.js';

// ---------------------------------------------------------------------------
// Operands
// ---------------------------------------------------------------------------

export const conditionOperandLiteralSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const conditionOperandSchema = z.union([conditionOperandLiteralSchema, refSchema]);

export type ConditionOperandLiteral = z.infer<typeof conditionOperandLiteralSchema>;
export type ConditionOperand = z.infer<typeof conditionOperandSchema>;

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export const comparisonConditionOpSchema = z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte']);

export const comparisonConditionSchema = z.object({
  op: comparisonConditionOpSchema,
  left: conditionOperandSchema,
  right: conditionOperandSchema,
});

export type ComparisonCondition = z.infer<typeof comparisonConditionSchema>;

export const conditionSchema: z.ZodType<
  | boolean
  | { $ref: string }
  | { op: 'not'; value: Condition }
  | { op: 'and'; values: Condition[] }
  | { op: 'or'; values: Condition[] }
  | ComparisonCondition
> = z.lazy(() =>
  z.union([
    z.boolean(),
    refSchema,
    z.object({
      op: z.literal('not'),
      value: conditionSchema,
    }),
    z.object({
      op: z.literal('and'),
      values: z.array(conditionSchema).min(1),
    }),
    z.object({
      op: z.literal('or'),
      values: z.array(conditionSchema).min(1),
    }),
    comparisonConditionSchema,
  ]),
);

export type Condition = z.infer<typeof conditionSchema>;
