import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/internal/style-semantics.ts',
    'src/internal/style-output.ts',
    'src/internal/style-key-sets.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
