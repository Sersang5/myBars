import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const MAILPIT = "http://127.0.0.1:54324";

// These tests start signed out.
test.use({ storageState: { cookies: [], origins: [] } });

type MailpitList = { messages: { ID: string; To: { Address: string }[] }[] };

async function mailIds(): Promise<Set<string>> {
  const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json()) as MailpitList;
  return new Set(list.messages.map((m) => m.ID));
}

/** Text of the first email to `email` that was not in `before`, from Mailpit's API. */
async function newEmailText(email: string, before: Set<string>): Promise<string> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json()) as MailpitList;
    const msg = list.messages.find(
      (m) => !before.has(m.ID) && m.To.some((t) => t.Address.toLowerCase() === email.toLowerCase()),
    );
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { Text: string };
      return full.Text;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No login email for ${email} in Mailpit`);
}

/**
 * The 6-digit code from the email (supabase/templates/magic_link.html includes {{ .Token }}).
 * If the running local Supabase was started before that template existed, its default email has
 * no code; then issue a fresh one with the admin API so the UI path is still exercised.
 */
async function loginCode(email: string, before: Set<string>): Promise<string> {
  const text = await newEmailText(email, before);
  const fromEmail = text.match(/\b(\d{6})\b/)?.[1];
  if (fromEmail) return fromEmail;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return data.properties.email_otp;
}

test("a magic link that cannot be validated explains what to do", async ({ page }) => {
  await page.goto("/auth/callback?code=not-a-real-code");
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo validar" })).toHaveText(
    "No se pudo validar el enlace. Ábrelo en el mismo navegador donde lo pediste, o usa el código de 6 dígitos.",
  );
});

test("sign in with the 6-digit code from the email", async ({ page }) => {
  const email = process.env.ALLOWED_EMAIL!;
  await page.goto("/login");
  const before = await mailIds();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  const codeInput = page.getByRole("textbox", { name: "Código del correo" });
  await expect(codeInput).toBeVisible();
  await codeInput.fill(await loginCode(email, before));
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/bars$/);
});
