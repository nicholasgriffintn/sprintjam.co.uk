import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema:
    "../../packages/db/src/durable-objects/standup/schemas/standup-meta.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
