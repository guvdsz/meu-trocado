import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3179",
    channel: process.platform === "win32" ? "msedge" : undefined,
    headless: true,
    locale: "pt-BR",
    viewport: { width: 1440, height: 1050 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/ui/preview-server.mjs",
    url: "http://127.0.0.1:3179",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
