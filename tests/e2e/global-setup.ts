import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "e2e-only-password-0000";

type Cookie = { name: string; value: string };

/** Clean slate: recreate the allowed user, sign in and save the session cookies as storageState. */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ALLOWED_EMAIL;
  if (!url || !anon || !serviceKey || !email) {
    throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and ALLOWED_EMAIL (.env.test)");
  }

  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error("Refusing to run E2E setup against a non-local Supabase");
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  for (const u of list.users) {
    if (u.email?.toLowerCase() === email.toLowerCase()) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) throw error;
    }
  }
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;

  // Sign in through the same cookie format @supabase/ssr uses in the app.
  const cookies = new Map<string, string>();
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]): Cookie => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  const { error: signInError } = await ssr.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;

  const file = path.resolve(process.cwd(), "tests/e2e/.auth/state.json");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({
      cookies: [...cookies].map(([name, value]) => ({
        name,
        value,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      })),
      origins: [],
    }),
  );
}
