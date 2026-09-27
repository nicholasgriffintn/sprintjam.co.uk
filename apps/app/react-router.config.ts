import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  appDirectory: "./src",
  future: {
    v8_viteEnvironmentApi: true,
    unstable_optimizeDeps: true,
  },
} satisfies Config;
