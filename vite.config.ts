import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  environments: {
    my_worker: {
      define: {
        __APP_VERSION__: JSON.stringify("v1.0.0"),
      },
    },
  },
  plugins: [cloudflare()],
});