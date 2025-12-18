import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const shouldStartWebServer = !process.env.E2E_BASE_URL;
const shouldRunA11y = process.env.PLAYWRIGHT_RUN_A11Y === "1";

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: shouldRunA11y ? [] : ['**/a11y/**'],
  workers: 1,
  timeout: 15_000,
  expect: {
    timeout: 3_000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    trace: isCI ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: isCI ? 'retain-on-failure' : 'off',
    actionTimeout: 3_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: 'npm run dev -- --host 0.0.0.0',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !isCI,
        timeout: 120_000,
        cwd: process.cwd(),
      }
    : undefined,
});
