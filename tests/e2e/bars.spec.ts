import { expect, test, type Page } from "@playwright/test";
import { addFirstCity, resetData, setStars } from "./helpers";

async function addVisitedBar(page: Page, place: string, tag: string, tagRating: number) {
  await page.getByRole("button", { name: "Añadir bar" }).last().click();
  await page.getByRole("searchbox", { name: "Buscar lugar" }).fill("Bar");
  await page.getByRole("button", { name: new RegExp(place) }).click();

  const form = page.getByRole("dialog", { name: place });
  await setStars(form.getByRole("slider", { name: "Comida", exact: true }), 4.5);
  await form.getByPlaceholder("Añadir etiqueta…").fill(tag);
  await form.getByPlaceholder("Añadir etiqueta…").press("Enter");
  await setStars(form.getByRole("slider", { name: `Valoración de ${tag}` }), tagRating);
  await form.getByRole("button", { name: "Guardar", exact: true }).click();

  // Saving opens the bar detail sheet; close it to get back to the list.
  const detail = page.getByRole("dialog", { name: place });
  await expect(detail.getByRole("button", { name: "Editar" })).toBeVisible();
  await detail.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test.beforeEach(async () => {
  await resetData();
});

test("add bars, filter by tag and search", async ({ page }) => {
  await page.goto("/bars");
  await addFirstCity(page);

  // Lower tag rating first, so the expected order differs from insertion and alphabetical order.
  await addVisitedBar(page, "Bar La Tortilla", "Tortilla", 3);
  await expect(page.getByRole("button", { name: /Bar La Tortilla/ })).toContainText("tortilla 3");
  await addVisitedBar(page, "Casa Pepe", "Tortilla", 5);
  await expect(page.getByRole("button", { name: /Casa Pepe/ })).toBeVisible();

  // Filter by the tag: the bar with the higher tag rating comes first.
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.getByRole("button", { name: "tortilla", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const cards = page.getByRole("button", { name: /Última visita/ });
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Casa Pepe");
  await expect(cards.nth(0)).toContainText("tortilla 5");
  await expect(cards.nth(1)).toContainText("Bar La Tortilla");
  await expect(cards.nth(1)).toContainText("tortilla 3");

  // Free-text search matches both (name for one, tag for the other).
  await page.getByRole("button", { name: /Quitar filtro tortilla/ }).click();
  await page.getByRole("searchbox", { name: "Buscar", exact: true }).fill("tort");
  await expect(cards).toHaveCount(2);

  // A non-matching search finds nothing.
  await page.getByRole("searchbox", { name: "Buscar", exact: true }).fill("zzz");
  await expect(cards).toHaveCount(0);
});

test("a bar saved into another city shows a notice that switches to it", async ({ page }) => {
  await page.goto("/bars");
  await addFirstCity(page);

  await page.getByRole("button", { name: "Añadir bar" }).last().click();
  await page.getByRole("searchbox", { name: "Buscar lugar" }).fill("Bar");
  await page.getByRole("button", { name: /Bar Oleiros/ }).click();
  await page.getByRole("dialog", { name: "Bar Oleiros" }).getByRole("button", { name: "Guardar", exact: true }).click();

  // Still on A Coruña: the bar is not in this list, but the notice says where it went.
  const notice = page.getByRole("status").filter({ hasText: "Guardado en Oleiros" });
  await expect(notice).toBeVisible();
  await expect(page.getByRole("button", { name: /Última visita/ })).toHaveCount(0);

  await notice.getByRole("button", { name: "Ver" }).click();
  await expect(page.getByRole("button", { name: /Oleiros/ }).first()).toBeVisible();
  const detail = page.getByRole("dialog", { name: "Bar Oleiros" });
  await expect(detail.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(notice).toBeHidden();
});
