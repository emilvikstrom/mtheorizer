import { defineConfig, devices } from "@playwright/test";

// The app under test is the nginx image from docker-compose.yml (service "app"), reached over the compose network.
const baseURL = process.env.BASE_URL ?? "http://app";

export default defineConfig({
  testDir: "./tests",
  // Named *.e2e.ts so that Vitest in the app (which looks for *.test.ts and *.spec.ts) never picks them up.
  testMatch: "**/*.e2e.ts",
  // Baselines live next to the tests, one folder per spec, and are rendered in the same Linux image as CI.
  snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Light theme and no motion, so screenshots do not depend on the machine's settings.
    colorScheme: "light",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
});
