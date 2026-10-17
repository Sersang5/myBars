import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// Local Supabase URLs/keys and ALLOWED_EMAIL for the E2E run.
const envFile = path.resolve(process.cwd(), ".env.test");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 375, height: 812 },
    storageState: "tests/e2e/.auth/state.json",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PLACES_FAKE: "1",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      ALLOWED_EMAIL: process.env.ALLOWED_EMAIL ?? "",
      // Never real keys: the fake Places client and no LLM calls are used in E2E.
      GOOGLE_MAPS_API_KEY: "e2e-fake-key",
      ANTHROPIC_API_KEY: "e2e-fake-key",
    },
  },
});
