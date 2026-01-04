import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './api/d1/migrations',
  schema: './api/d1/schemas/index.ts',
  dialect: 'sqlite',
});
