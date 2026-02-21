import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const isCI = !!process.env.CI;
const configDir = path.dirname(fileURLToPath(import.meta.url));
const localCertPath = path.resolve(configDir, ".certs/local.pem");
const localKeyPath = path.resolve(configDir, ".certs/local-key.pem");
const useLocalHttps =
  fs.existsSync(localCertPath) && fs.existsSync(localKeyPath);
const localBaseURL = useLocalHttps
  ? "https://sandbox.localhost:5173"
  : "http://127.0.0.1:5173";
const baseURL = process.env.E2E_BASE_URL ?? localBaseURL;
const shouldStartWebServer = !process.env.E2E_BASE_URL;
const shouldRunA11y = process.env.PLAYWRIGHT_RUN_A11Y === "1";
const shouldRunSmoke = process.env.PLAYWRIGHT_RUN_SMOKE === "1";
const shouldIgnoreHTTPSErrors =
  process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "1" ||
  (shouldStartWebServer && useLocalHttps);
const commonTestIgnore = shouldRunA11y ? [] : ["**/a11y/**"];

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: commonTestIgnore,
  grep: shouldRunSmoke ? /@smoke/ : undefined,
  workers: isCI ? 2 : 4,
  timeout: 15_000,
  expect: {
    timeout: 3_000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    ignoreHTTPSErrors: shouldIgnoreHTTPSErrors,
    testIdAttribute: "data-testid",
    trace: isCI ? "retain-on-failure" : "off",
    screenshot: process.env.CI ? "only-on-failure" : "off",
    video: isCI ? "retain-on-failure" : "off",
    actionTimeout: 3_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [...commonTestIgnore, "**/*mobile.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: ["**/*mobile.spec.ts"],
      use: {
        ...devices["iPhone 15 Pro"],
        viewport: devices["iPhone 15 Pro"].viewport,
        hasTouch: true,
      },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: "npm run dev -- --host 0.0.0.0",
        port: 5173,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        cwd: configDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
});
