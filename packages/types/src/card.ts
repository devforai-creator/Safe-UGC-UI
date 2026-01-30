/**
 * @safe-ugc-ui/types — Card Document
 *
 * Defines the top-level UGC card document structure, based on spec section 7
 * (example cards).
 *
 * A card consists of:
 *   - meta:   name and version
 *   - assets: optional mapping of asset keys to @assets/ paths
 *   - state:  optional initial state values
 *   - views:  named view definitions, each a UGCNode tree
 *
 * Naming convention:
 *   - Zod schema  -> `fooSchema`
 *   - Inferred TS -> `Foo`
 */

import { z } from 'zod';
import { ugcNodeSchema } from './primitives.js';

// ---------------------------------------------------------------------------
// 1. CardMeta
// ---------------------------------------------------------------------------

export const cardMetaSchema = z.object({
  name: z.string(),
  version: z.string(),
});

export type CardMeta = z.infer<typeof cardMetaSchema>;

// ---------------------------------------------------------------------------
// 2. UGCCard — top-level card document
// ---------------------------------------------------------------------------

export const ugcCardSchema = z.object({
  meta: cardMetaSchema,
  assets: z.record(z.string(), z.string()).optional(),
  state: z.record(z.string(), z.unknown()).optional(),
  views: z.record(z.string(), ugcNodeSchema),
});

export type UGCCard = z.infer<typeof ugcCardSchema>;
