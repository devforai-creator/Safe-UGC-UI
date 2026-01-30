import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/types',
  'packages/schema',
  'packages/validator',
  'packages/react',
]);
