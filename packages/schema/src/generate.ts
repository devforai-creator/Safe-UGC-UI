/**
 * @safe-ugc-ui/schema — JSON Schema Generator (build-time script)
 *
 * Converts the Zod-based UGCCard schema from @safe-ugc-ui/types into a
 * standard JSON Schema document and writes it to dist/ugc-card.schema.json.
 *
 * Run via: `node dist/generate.js` (called automatically by the build script).
 *
 * NOTE: This produces a *structural* schema only. Context-dependent rules
 * (position constraints, security checks, resource limits, etc.) cannot be
 * expressed in JSON Schema and require the validator package.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ugcCardSchema } from '@safe-ugc-ui/types';
import { zodToJsonSchema } from 'zod-to-json-schema';

const jsonSchema = zodToJsonSchema(ugcCardSchema, {
  name: 'UGCCard',
  nameStrategy: 'title',
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, 'ugc-card.schema.json');

writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), 'utf-8');

console.log(`Generated ${outputPath}`);
