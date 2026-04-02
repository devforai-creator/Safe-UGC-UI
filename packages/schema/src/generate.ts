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

import { generateCardSchema } from './index.js';

export function generateCardSchemaJson(): string {
  return JSON.stringify(generateCardSchema(), null, 2);
}

export function getDefaultOutputPath(moduleUrl: string = import.meta.url): string {
  const moduleDir = dirname(fileURLToPath(moduleUrl));
  return resolve(moduleDir, 'ugc-card.schema.json');
}

export function writeGeneratedSchema(outputPath: string): string {
  writeFileSync(outputPath, generateCardSchemaJson(), 'utf-8');
  return outputPath;
}

export function runGenerateScript(moduleUrl: string = import.meta.url): string {
  return writeGeneratedSchema(getDefaultOutputPath(moduleUrl));
}

export function isDirectExecution(
  moduleUrl: string = import.meta.url,
  argv1: string | undefined = process.argv[1],
): boolean {
  if (!argv1) {
    return false;
  }

  return fileURLToPath(moduleUrl) === resolve(argv1);
}

if (isDirectExecution()) {
  const outputPath = runGenerateScript();
  console.log(`Generated ${outputPath}`);
}
