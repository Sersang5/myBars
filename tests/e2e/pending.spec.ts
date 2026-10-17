import { expect, test } from "@playwright/test";
import { addFirstCity, resetData } from "./helpers";

test.beforeEach(async () => {
  await resetData();
});

test("add a pending bar, mark it visited and see it in Mis Bares", async ({ page }) => {
  await page.goto("/pending");
  await addFirstCity(page);

  await page.getByRole("button", { name: "Añadir pendiente" }).click();
  await page.getByRole("searchbox", { name: "Buscar lugar" }).fill("Bar");
  await page.getByRole("button", { name: /Casa Pepe/ }).click();
  await expect(page.getByText("Casa Pepe")).toBeVisible();

  await page.getByRole("button", { name: "Ya he ido → valorar" }).click();
  await page.getByRole("dialog", { name: "Casa Pepe" }).getByRole("button", { name: "Guardar visita" }).click();

  await expect(page).toHaveURL(/\/bars$/);
  const card = page.getByRole("button", { name: /Casa Pepe/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Última visita: hoy");
});
