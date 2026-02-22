import { defineConfig } from 'vitest/config';
import fs from 'node:fs';

const sqlPlugin = () => ({
  name: 'vite-plugin-sql',
  transform(_code: string, id: string) {
    if (id.endsWith('.sql')) {
      const sql = fs.readFileSync(id, 'utf-8');
      return {
        code: `export default ${JSON.stringify(sql)}`,
        map: null,
      };
    }
  },
});

export default defineConfig({
  plugins: [sqlPlugin()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
