import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { generateCardSchema } from './index.js';
import {
  generateCardSchemaJson,
  getDefaultOutputPath,
  isDirectExecution,
  runGenerateScript,
  writeGeneratedSchema,
} from './generate.js';

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
}

describe('generateCardSchema', () => {
  it('generates the expected top-level card schema shape', () => {
    const schema = generateCardSchema() as {
      type?: string;
      required?: string[];
      properties?: Record<string, unknown>;
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['meta', 'views']);
    expect(schema.properties).toMatchObject({
      meta: { type: 'object' },
      assets: { type: 'object' },
      state: { type: 'object' },
      styles: { type: 'object' },
      fragments: { type: 'object' },
      views: { type: 'object' },
    });
  });

  it('includes $ref support in structured style leaf fields', () => {
    const schema = generateCardSchema() as {
      properties?: {
        styles?: {
          additionalProperties?: {
            properties?: Record<string, unknown>;
          };
        };
      };
    };

    const styleProps = schema.properties?.styles?.additionalProperties?.properties as
      | Record<string, any>
      | undefined;

    expect(styleProps?.border?.properties?.color?.anyOf).toHaveLength(2);
    expect(styleProps?.transform?.properties?.scale?.anyOf).toHaveLength(2);
    expect(styleProps?.boxShadow?.anyOf?.[0]?.properties?.color?.anyOf).toHaveLength(2);
    expect(styleProps?.textShadow?.anyOf?.[0]?.properties?.color?.anyOf).toHaveLength(2);
    expect(styleProps?.fontFamily?.anyOf).toHaveLength(2);
    expect(
      styleProps?.backgroundGradient?.anyOf?.[0]?.properties?.stops?.items?.properties?.color?.anyOf,
    ).toHaveLength(2);
  });

  it('keeps representative structured style schema output stable', () => {
    const schema = generateCardSchema() as {
      properties?: {
        styles?: {
          additionalProperties?: {
            properties?: Record<string, unknown>;
          };
        };
      };
    };

    const styleProps = schema.properties?.styles?.additionalProperties?.properties as
      | Record<string, any>
      | undefined;

    expect({
      border: styleProps?.border,
      fontFamily: styleProps?.fontFamily,
    }).toMatchInlineSnapshot(`
      {
        "border": {
          "additionalProperties": false,
          "properties": {
            "color": {
              "anyOf": [
                {
                  "type": "string",
                },
                {
                  "$ref": "#/definitions/UGCCard/properties/styles/additionalProperties/properties/display/anyOf/1",
                },
              ],
            },
            "style": {
              "anyOf": [
                {
                  "enum": [
                    "solid",
                    "dashed",
                    "dotted",
                    "none",
                  ],
                  "type": "string",
                },
                {
                  "$ref": "#/definitions/UGCCard/properties/styles/additionalProperties/properties/display/anyOf/1",
                },
              ],
            },
            "width": {
              "anyOf": [
                {
                  "type": "number",
                },
                {
                  "$ref": "#/definitions/UGCCard/properties/styles/additionalProperties/properties/display/anyOf/1",
                },
              ],
            },
          },
          "required": [
            "width",
            "style",
            "color",
          ],
          "type": "object",
        },
        "fontFamily": {
          "anyOf": [
            {
              "enum": [
                "sans",
                "serif",
                "mono",
                "rounded",
                "display",
                "handwriting",
              ],
              "type": "string",
            },
            {
              "$ref": "#/definitions/UGCCard/properties/styles/additionalProperties/properties/display/anyOf/1",
            },
          ],
        },
      }
    `);
  });

  it('matches the checked-in static schema artifact', () => {
    const generated = generateCardSchema();
    const staticSchema = readJson(
      fileURLToPath(new URL('../dist/ugc-card.schema.json', import.meta.url)),
    );

    expect(staticSchema).toEqual(generated);
  });
});

describe('generate.ts helpers', () => {
  it('serializes the generated schema as formatted JSON', () => {
    const serialized = generateCardSchemaJson();
    expect(JSON.parse(serialized)).toEqual(generateCardSchema());
    expect(serialized.endsWith('\n')).toBe(false);
  });

  it('computes the default output path next to the generate module', () => {
    const moduleUrl = pathToFileURL('/tmp/schema-build/generate.js').href;
    expect(getDefaultOutputPath(moduleUrl)).toBe('/tmp/schema-build/ugc-card.schema.json');
  });

  it('writes a schema file to an explicit path', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'safe-ugc-schema-'));
    const outputPath = join(tempDir, 'card.schema.json');

    expect(writeGeneratedSchema(outputPath)).toBe(outputPath);
    expect(readJson(outputPath)).toEqual(generateCardSchema());
  });

  it('writes the default schema filename when run as a script helper', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'safe-ugc-generate-'));
    const moduleUrl = pathToFileURL(join(tempDir, 'generate.js')).href;
    const outputPath = join(tempDir, 'ugc-card.schema.json');

    expect(runGenerateScript(moduleUrl)).toBe(outputPath);
    expect(readJson(outputPath)).toEqual(generateCardSchema());
  });

  it('detects direct execution using the module path and argv[1]', () => {
    const scriptPath = '/tmp/schema-build/generate.js';
    const scriptUrl = pathToFileURL(scriptPath).href;

    expect(isDirectExecution(scriptUrl, scriptPath)).toBe(true);
    expect(isDirectExecution(scriptUrl, '/tmp/schema-build/other.js')).toBe(false);
    expect(isDirectExecution(scriptUrl, undefined)).toBe(false);
  });
});
