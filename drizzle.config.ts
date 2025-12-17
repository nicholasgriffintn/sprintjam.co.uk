import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './api/drizzle',
  schema: './api/db/schemas/index.ts',
  dialect: 'sqlite',
  driver: 'durable-sqlite',
});
