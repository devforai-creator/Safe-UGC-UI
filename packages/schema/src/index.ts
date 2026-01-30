/**
 * @safe-ugc-ui/schema — Public API
 *
 * Provides programmatic access to the UGC Card JSON Schema.
 *
 * For the static JSON file (editor / ajv integration), import from:
 *   `@safe-ugc-ui/schema/ugc-card.schema.json`
 *
 * For runtime generation:
 *   `import { generateCardSchema } from '@safe-ugc-ui/schema';`
 *
 * IMPORTANT: JSON Schema covers structural validation only.
 * Security rules, resource limits, and context-dependent checks require
 * the @safe-ugc-ui/validator package.
 */

import { ugcCardSchema } from '@safe-ugc-ui/types';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Generate the UGC Card JSON Schema at runtime.
 *
 * Returns a plain object conforming to JSON Schema Draft 7.
 * Equivalent to the static `ugc-card.schema.json` file produced at build time.
 */
export function generateCardSchema(): Record<string, unknown> {
  return zodToJsonSchema(ugcCardSchema, {
    name: 'UGCCard',
    nameStrategy: 'title',
  }) as Record<string, unknown>;
}
