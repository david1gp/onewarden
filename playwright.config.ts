import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.ONEWARDEN_BROWSER_BASE_URL ?? "http://127.0.0.1:3000",
    colorScheme: "light",
    ...devices["Desktop Chrome"],
  },
})
