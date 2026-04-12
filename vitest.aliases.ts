import { fileURLToPath, URL } from 'node:url';

export const workspaceAliases = {
  '@safe-ugc-ui/types': fileURLToPath(new URL('./packages/types/src/index.ts', import.meta.url)),
  '@safe-ugc-ui/schema': fileURLToPath(new URL('./packages/schema/src/index.ts', import.meta.url)),
  '@safe-ugc-ui/validator': fileURLToPath(
    new URL('./packages/validator/src/index.ts', import.meta.url),
  ),
  '@safe-ugc-ui/react': fileURLToPath(new URL('./packages/react/src/index.ts', import.meta.url)),
} as const;
