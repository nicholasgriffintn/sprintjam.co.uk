import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["api/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
