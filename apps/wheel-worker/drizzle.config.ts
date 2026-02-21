import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "../../packages/db/src/durable-objects/wheel/schemas/wheel-meta.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
