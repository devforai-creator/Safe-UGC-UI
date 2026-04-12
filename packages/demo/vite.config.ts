import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@safe-ugc-ui/types/internal/style-semantics',
        replacement: fileURLToPath(
          new URL('../types/src/internal/style-semantics.ts', import.meta.url),
        ),
      },
      {
        find: '@safe-ugc-ui/types/internal/style-output',
        replacement: fileURLToPath(
          new URL('../types/src/internal/style-output.ts', import.meta.url),
        ),
      },
      {
        find: '@safe-ugc-ui/types/internal/style-key-sets',
        replacement: fileURLToPath(
          new URL('../types/src/internal/style-key-sets.ts', import.meta.url),
        ),
      },
      {
        find: /^@safe-ugc-ui\/types$/,
        replacement: fileURLToPath(new URL('../types/src/index.ts', import.meta.url)),
      },
      {
        find: /^@safe-ugc-ui\/validator$/,
        replacement: fileURLToPath(new URL('../validator/src/index.ts', import.meta.url)),
      },
      {
        find: /^@safe-ugc-ui\/react$/,
        replacement: fileURLToPath(new URL('../react/src/index.ts', import.meta.url)),
      },
    ],
  },
});
