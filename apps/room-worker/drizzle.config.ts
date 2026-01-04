import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: '../../packages/db/src/durable-objects/schemas/index.ts',
  dialect: 'sqlite',
  driver: 'durable-sqlite',
});
