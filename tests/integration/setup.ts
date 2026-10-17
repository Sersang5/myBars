import { existsSync } from "node:fs";
import path from "node:path";

// Load .env.test (local Supabase URLs/keys) into process.env for integration tests.
const envFile = path.resolve(process.cwd(), ".env.test");
if (existsSync(envFile)) process.loadEnvFile(envFile);
