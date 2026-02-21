import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

export default defineConfig(() => {
  const localCertPath = path.resolve(__dirname, ".certs/local.pem");
  const localKeyPath = path.resolve(__dirname, ".certs/local-key.pem");
  const useHttps = fs.existsSync(localCertPath) && fs.existsSync(localKeyPath);

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      https: useHttps
        ? {
            cert: fs.readFileSync(localCertPath),
            key: fs.readFileSync(localKeyPath),
          }
        : undefined,
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
      sourcemap: true,
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
            configPath: "../wheel-worker/wrangler.jsonc",
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
  };
});
