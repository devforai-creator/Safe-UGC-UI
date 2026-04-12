import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../vitest.aliases.js';

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
