import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { reactRouter } from "@react-router/dev/vite";
import path from "path";
import fs from "fs";

export default defineConfig((env) => {
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
    plugins: [
      tailwindcss(),
      reactRouter(),
      cloudflare({
        viteEnvironment: { name: "ssr" },
        auxiliaryWorkers:
          env.command === "build"
            ? []
            : [
                {
                  configPath: "../room-worker/wrangler.json",
                },
                {
                  configPath: "../wheel-worker/wrangler.json",
                },
                {
                  configPath: "../auth-worker/wrangler.json",
                },
                {
                  configPath: "../stats-worker/wrangler.json",
                },
                {
                  configPath: "../standup-worker/wrangler.json",
                },
              {
                configPath: "../retro-worker/wrangler.json",
              },
              ],
        persistState: {
          path: "../../.data",
        },
      }),
    ],
  };
});
