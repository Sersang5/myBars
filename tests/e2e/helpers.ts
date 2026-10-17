import { expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** Deletes all of the E2E user's data (service role bypasses RLS). Tables ordered child-first. */
export async function resetData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const table of ["bar_tags", "visits", "my_bars", "places", "tags", "cities"]) {
    const { error } = await admin.from(table).delete().not("user_id", "is", null);
    if (error) throw new Error(`reset ${table}: ${error.message}`);
  }
}

/** On a fresh account the app asks for a first city; add the fake "A Coruña". */
export async function addFirstCity(page: Page) {
  await expect(page.getByRole("heading", { name: "Añade tu primera ciudad" })).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar ciudad" }).fill("Coru");
  await page.getByRole("button", { name: /A Coruña/ }).click();
  await expect(page.getByRole("button", { name: /A Coruña/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Añade tu primera ciudad" })).toBeHidden();
}

/** Sets a half-step star slider by keyboard (each ArrowRight adds 0.5). */
export async function setStars(slider: Locator, value: number) {
  await slider.focus();
  await slider.press("Home").catch(() => undefined);
  for (let i = 0; i < value * 2; i++) await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", String(value));
}
