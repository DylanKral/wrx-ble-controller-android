import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    ...(process.env.WRX_TEST_WEBKIT === "1" ? [{
      name: "webkit",
      testMatch: /(?:mobileLayout|mainSpeed|customSpeed|simulation|colorPicker)\.spec\.ts/,
      use: { browserName: "webkit" as const },
    }] : []),
  ],
  use: {
    baseURL: "http://127.0.0.1:4173/",
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  },
  webServer: {
    command: process.env.WRX_TEST_PRODUCTION === "1"
      ? "npm run preview -- --port 4173 --strictPort"
      : "npm run dev -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
