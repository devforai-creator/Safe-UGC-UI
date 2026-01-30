import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/generate.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
