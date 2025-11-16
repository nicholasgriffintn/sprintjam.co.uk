import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'strudel-vendor': ['@strudel/web'],
          'query-vendor': ['@tanstack/react-query'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
    sourcemap: command === 'build' ? false : true,
  },
  plugins: [react(), tailwindcss(), cloudflare()],
}));