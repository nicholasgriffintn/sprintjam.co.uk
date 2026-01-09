import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const resolveFromRoot = (...segments: string[]) =>
  path.resolve(fileURLToPath(new URL(".", import.meta.url)), ...segments);

const sqlPlugin = () => ({
  name: "vite-plugin-sql",
  transform(_code: string, id: string) {
    if (id.endsWith(".sql")) {
      const sql = fs.readFileSync(id, "utf-8");
      return {
        code: `export default ${JSON.stringify(sql)}`,
        map: null,
      };
    }
  },
});

export default defineConfig({
  plugins: [sqlPlugin()],
  resolve: {
    alias: {
      "@": resolveFromRoot("src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
