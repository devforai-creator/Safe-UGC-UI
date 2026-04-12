import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@safe-ugc-ui/types': fileURLToPath(new URL('../types/src/index.ts', import.meta.url)),
      '@safe-ugc-ui/validator': fileURLToPath(new URL('../validator/src/index.ts', import.meta.url)),
      '@safe-ugc-ui/react': fileURLToPath(new URL('../react/src/index.ts', import.meta.url)),
    },
  },
});
