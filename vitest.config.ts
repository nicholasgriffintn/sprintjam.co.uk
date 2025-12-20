import { defineConfig } from "vitest/config";
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const resolveFromRoot = (...segments: string[]) =>
  path.resolve(fileURLToPath(new URL('.', import.meta.url)), ...segments);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolveFromRoot('src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['api/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
