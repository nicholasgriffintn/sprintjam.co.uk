import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "strudel-vendor": ["@strudel/web"],
          "tanstack-vendor": [
            "@tanstack/react-query",
            "@tanstack/db",
            "@tanstack/query-core",
            "@tanstack/query-db-collection",
          ],
          "framer-vendor": ["framer-motion"],
          "icons-vendor": ["lucide-react"],
          "ui-vendor": ["qrcode.react", "canvas-confetti"],
        },
      },
    },
    sourcemap: command === "build" ? false : true,
  },
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      auxiliaryWorkers: [
        {
          configPath: "../room-worker/wrangler.jsonc",
        },
        {
          configPath: "../auth-worker/wrangler.jsonc",
        },
        {
          configPath: "../stats-worker/wrangler.jsonc",
        },
      ],
      persistState: {
        path: "../../.data",
      },
    }),
  ],
}));
