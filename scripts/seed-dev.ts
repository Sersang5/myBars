/**
 * Seeds 3 visited bars (with tags) into LOCAL Supabase for ALLOWED_EMAIL, then
 * prints list/filter/sort/search results computed with the real repo + query code.
 *
 *   npx tsx scripts/seed-dev.ts
 *
 * Reads .env.test (local Supabase URL/keys). Creates the user if missing and gives it a
 * random throwaway password that is never printed.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseBarsRepo } from "../lib/bars/repo.supabase";
import { createBarsService } from "../lib/bars/service";
import { defaultSort, filterBars, sortBars } from "../lib/bars/query";
import { overallRating } from "../lib/bars/rating";
import type { PlaceDetails, PlacesClient } from "../lib/places/types";

process.loadEnvFile(".env.test");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const email = process.env.ALLOWED_EMAIL!;
if (!url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) {
  throw new Error("Refusing to seed a non-local Supabase");
}

const make = (id: string, name: string, street: string, rating: number, count: number, price: 1 | 2 | 3 | 4): PlaceDetails => ({
  googlePlaceId: id,
  name,
  address: `${street}, 15001 A Coruña, España`,
  location: { lat: 43.37, lng: -8.4 },
  rating,
  userRatingCount: count,
  priceLevel: price,
  mapsUrl: `https://maps.google.com/?cid=${id}`,
  addressComponents: [{ longText: "A Coruña", shortText: "A Coruña", types: ["locality", "political"] }],
  reviews: [],
  editorialSummary: null,
  openNow: null,
  photoRef: null,
});

const catalog = [
  make("seed-1", "Bar Pepe", "Rúa Real 12", 4.4, 1234, 2),
  make("seed-2", "Café Nube", "Praza de Lugo 3", 4.7, 310, 1),
  make("seed-3", "Taberna O Fogar", "Rúa Franja 8", 4.1, 87, 3),
  make("seed-4", "Vermutería Nova", "Rúa Olmos 5", 4.5, 42, 2),
];

async function main() {
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const password = randomBytes(18).toString("hex");
  const list = await admin.auth.admin.listUsers();
  let user = list.data?.users.find((u) => u.email === email);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password });
  } else {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    user = created.data.user;
  }
  const sb = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const signedIn = await sb.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const repo = createSupabaseBarsRepo(sb);
  const places = {
    textSearch: async () => [],
    autocomplete: async () => [],
    details: async (id: string) => catalog.find((p) => p.googlePlaceId === id)!,
  } as unknown as PlacesClient;
  const service = createBarsService({
    repo,
    places,
    details: async (id) => catalog.find((p) => p.googlePlaceId === id)!,
    today: () => new Date().toISOString().slice(0, 10),
  });

  const inputs = [
    { ratingLocal: 4, ratingService: 4.5, ratingFood: 4.5, priceLevel: 2 as const, notes: "Buenas croquetas y un café muy bueno", tags: [{ name: "tortilla", rating: 5 }, { name: "croquetas", rating: 4 }] },
    { ratingLocal: 5, ratingService: 4, ratingFood: 3.5, priceLevel: 1 as const, notes: "Buen café con leche", tags: [{ name: "café", rating: 4.5 }, { name: "tortilla", rating: 3 }] },
    { ratingLocal: 3.5, ratingService: 3.5, ratingFood: 4, priceLevel: 3 as const, notes: "", tags: [{ name: "vermut", rating: 4 }] },
  ];
  for (let i = 0; i < inputs.length; i++) {
    const r = await service.addVisitedBar(catalog[i].googlePlaceId, inputs[i]);
    console.log(`${catalog[i].name}: ${r.existed ? "already existed" : "created"}`);
  }

  const pending = await service.addPendingBar("seed-4", "Me lo recomendó Marta");
  console.log(`Vermutería Nova (pending): ${pending.existed ? "already existed" : "created"}`);

  const city = (await repo.listCities()).find((c) => c.name === "A Coruña")!;
  const bars = await repo.listBars(city.id, "visited");
  const tags = await repo.listTags();
  const show = (label: string, rows: typeof bars) =>
    console.log(`${label}: ${rows.map((b) => `${b.name}(${overallRating(b) ?? "-"})`).join(", ") || "(none)"}`);

  const today = new Date();
  show("all, default sort", sortBars(filterBars(bars, {}, today), defaultSort({})));
  const tortilla = tags.find((t) => t.name === "tortilla")!;
  const f1 = { tagIds: [tortilla.id] };
  show("tag=tortilla, tag sort", sortBars(filterBars(bars, f1, today), defaultSort(f1), tortilla.id));
  show('text "cafe"', filterBars(bars, { text: "cafe" }, today));
  show("price in {1,2}", filterBars(bars, { priceLevels: [1, 2] }, today));
  show("minFood 4", filterBars(bars, { minFood: 4 }, today));
  show("visited within 1 month", filterBars(bars, { visitedWithinMonths: 1 }, today));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
