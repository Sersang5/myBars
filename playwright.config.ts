import { defineConfig } from "@playwright/test";

// Minimal config; completed in Task 14.
export default defineConfig({
  testDir: "tests/e2e",
  use: { viewport: { width: 375, height: 812 } },
});
