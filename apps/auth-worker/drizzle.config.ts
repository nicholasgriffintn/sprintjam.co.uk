import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: '../../packages/db/src/d1/migration',
  schema: '../../packages/db/src/d1/schemas/index.ts',
  dialect: 'sqlite',
});
