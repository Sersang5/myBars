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
  // Only tags used in this city are offered, each with how many bars use it.
  await page.getByRole("button", { name: "tortilla 2", exact: true }).click();
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

test("save a half-typed tag, jump to its ranking, merge and delete tags", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await page.goto("/bars");
  await addFirstCity(page);
  await addVisitedBar(page, "Bar La Tortilla", "Croquetas", 4);

  // Typing a tag and saving without pressing Enter keeps it.
  await page.getByRole("button", { name: "Añadir bar" }).last().click();
  await page.getByRole("searchbox", { name: "Buscar lugar" }).fill("Bar");
  await page.getByRole("button", { name: /Casa Pepe/ }).click();
  const form = page.getByRole("dialog", { name: "Casa Pepe" });
  await form.getByPlaceholder("Añadir etiqueta…").fill("croq");
  // Existing tags are suggested while typing.
  await expect(form.getByRole("button", { name: "+ croquetas" })).toBeVisible();
  await form.getByPlaceholder("Añadir etiqueta…").fill("Croqueta");
  await form.getByRole("button", { name: "Guardar", exact: true }).click();

  // From the detail, a tag opens its ranking.
  const detail = page.getByRole("dialog", { name: "Casa Pepe" });
  await detail.getByRole("button", { name: "Ver ranking de croqueta" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Quitar filtro croqueta", exact: true })).toBeVisible();
  const cards = page.getByRole("button", { name: /Última visita/ });
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Casa Pepe");

  // Renaming onto an existing name merges both tags; the active filter follows.
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.getByRole("button", { name: "Gestionar etiquetas" }).click();
  const manager = page.getByRole("dialog", { name: "Etiquetas" });
  await manager.getByRole("button", { name: "Renombrar croqueta", exact: true }).click();
  await manager.getByRole("textbox", { name: "Nuevo nombre para croqueta", exact: true }).fill("croquetas");
  await manager.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(manager.getByRole("listitem")).toHaveCount(1);
  await expect(manager.getByRole("listitem")).toContainText("2 bares");
  await manager.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByRole("button", { name: "Quitar filtro croquetas", exact: true })).toBeVisible();
  await expect(cards).toHaveCount(2);

  // Deleting the tag removes it from the bars and from the filters.
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.getByRole("button", { name: "Gestionar etiquetas" }).click();
  await manager.getByRole("button", { name: "Borrar croquetas" }).click();
  await expect(manager.getByText("Aún no tienes etiquetas.")).toBeVisible();
  await manager.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByRole("list", { name: "Filtros activos" })).toBeHidden();
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).not.toContainText("croquetas");
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
