import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/internal/style-semantics.ts', 'src/internal/style-output.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
