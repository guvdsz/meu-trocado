import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3180",
    channel: process.platform === "win32" ? "msedge" : undefined,
    headless: true,
    locale: "pt-BR",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3180",
    url: "http://localhost:3180/manifest.webmanifest",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
