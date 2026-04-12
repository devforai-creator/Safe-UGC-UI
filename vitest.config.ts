import { defineConfig } from 'vitest/config';
import { workspaceAliases } from './vitest.aliases.js';

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    projects: ['packages/types', 'packages/schema', 'packages/validator', 'packages/react'],
    coverage: {
      include: [
        'packages/types/src/**/*.{ts,tsx}',
        'packages/schema/src/**/*.{ts,tsx}',
        'packages/validator/src/**/*.{ts,tsx}',
        'packages/react/src/**/*.{ts,tsx}',
      ],
      exclude: ['packages/demo/**', 'packages/**/dist/**', '**/*.test.ts', '**/*.test.tsx'],
      reportOnFailure: true,
      reporter: ['text', 'json-summary', 'html', 'lcov'],
    },
  },
});
