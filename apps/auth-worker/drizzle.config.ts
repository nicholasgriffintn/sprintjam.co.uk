import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "../../packages/db/src/d1/schemas/index.ts",
  dialect: "sqlite",
});
