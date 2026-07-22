import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log(`---👋 Loading Playwright Config ---`);

export const baseConfig = defineConfig({
  globalTimeout: 1 * 60 * 60 * 1000, // - 1 hour
  testDir: "./tests",
  testMatch: ["**/*.spec.ts"],
  outputDir: "test-results",
  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  expect: { timeout: 10_000 },

  globalSetup: "./tests/helpers/global-setup.ts",
  globalTeardown: "./tests/helpers/global-teardown.ts",

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    [
      "html",
      {
        open: "always",
      },
    ],
    [
      "allure-playwright",
      {
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          name: "TEST",
          appName: "Bewegungserinnerung",
          Release: "Release 1.1",
          node_version: process.version,
          outputFolder: "allure-results",
        },
      },
    ],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1200 },
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 5_000,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "node scripts/playwright-server.mjs",
    env: {
      NODE_ENV: "test",
    },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        channel: "chrome",
        //...devices["Desktop Chrome"],
        viewport: null,
        launchOptions: {
          args: [
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
            "--allow-no-sandbox-job",
          ],
        },
      },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], ignoreHTTPSErrors: true },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
    // {
    //     name: "Galaxy A55",
    //     use: {...devices["Galaxy A55"]}
    // }
  ],

});

export default baseConfig;
