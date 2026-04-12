import { fileURLToPath, URL } from 'node:url';

export const workspaceAliases = [
  {
    find: '@safe-ugc-ui/types/internal/style-semantics',
    replacement: fileURLToPath(
      new URL('./packages/types/src/internal/style-semantics.ts', import.meta.url),
    ),
  },
  {
    find: '@safe-ugc-ui/types/internal/style-output',
    replacement: fileURLToPath(
      new URL('./packages/types/src/internal/style-output.ts', import.meta.url),
    ),
  },
  {
    find: '@safe-ugc-ui/types/internal/style-key-sets',
    replacement: fileURLToPath(
      new URL('./packages/types/src/internal/style-key-sets.ts', import.meta.url),
    ),
  },
  {
    find: /^@safe-ugc-ui\/types$/,
    replacement: fileURLToPath(new URL('./packages/types/src/index.ts', import.meta.url)),
  },
  {
    find: /^@safe-ugc-ui\/schema$/,
    replacement: fileURLToPath(new URL('./packages/schema/src/index.ts', import.meta.url)),
  },
  {
    find: /^@safe-ugc-ui\/validator$/,
    replacement: fileURLToPath(new URL('./packages/validator/src/index.ts', import.meta.url)),
  },
  {
    find: /^@safe-ugc-ui\/react$/,
    replacement: fileURLToPath(new URL('./packages/react/src/index.ts', import.meta.url)),
  },
] as const;
