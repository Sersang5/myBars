import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSupabaseBarsRepo } from "@/lib/bars/repo.supabase";
import { createBarsService } from "@/lib/bars/service";
import { createCachedDetails } from "@/lib/places/cache";
import type { PlaceDetails, PlacesClient } from "@/lib/places/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const email = `repo-test-${Date.now()}@mybars.test`;
const password = "test-password-123";

const details: PlaceDetails = {
  googlePlaceId: "ChIJint-bar",
  name: "Bar Integración",
  address: "Calle Real 1, A Coruña",
  location: { lat: 43.37, lng: -8.4 },
  rating: 4.4,
  userRatingCount: 321,
  priceLevel: 2,
  mapsUrl: "https://maps.google.com/?cid=42",
  addressComponents: [{ longText: "A Coruña", shortText: "A Coruña", types: ["locality", "political"] }],
  reviews: [],
  editorialSummary: null,
  openNow: null,
  photoRef: "places/x/photos/y",
};

let admin: SupabaseClient;
let sb: SupabaseClient;
let userId: string;

beforeAll(async () => {
  admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  sb = createClient(url, anonKey, { auth: { persistSession: false } });
  const signedIn = await sb.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
});

afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId); // cascades to all of the user's rows
});

describe("createSupabaseBarsRepo", () => {
  it("stores and reads back city, place, bar, tags and visit through listBars", async () => {
    const repo = createSupabaseBarsRepo(sb);

    const city = await repo.insertCity({ name: "A Coruña", googlePlaceId: "ChIJint-city", location: { lat: 43.36, lng: -8.41 } });
    expect((await repo.findCityByName("a coruña"))?.id).toBe(city.id);
    expect((await repo.listCities()).map((c) => c.id)).toContain(city.id);

    const place = await repo.upsertPlace(details, city.id);
    const again = await repo.upsertPlace({ ...details, rating: 4.6 }, city.id);
    expect(again.id).toBe(place.id);

    // Cache: seeded on first insert, readable and updatable via PlaceStore.
    expect((await repo.get(details.googlePlaceId))?.details.name).toBe("Bar Integración");
    const fetchedAt = new Date("2026-10-01T10:00:00Z");
    await repo.put({ ...details, rating: 4.6, editorialSummary: "Cacheado" }, fetchedAt);
    const cached = await repo.get(details.googlePlaceId);
    expect(cached?.details.editorialSummary).toBe("Cacheado");
    expect(cached?.fetchedAt.toISOString()).toBe(fetchedAt.toISOString());

    const barId = await repo.insertBar(place.id, "visited", { ratingFood: 4.5, priceLevel: 2, notes: "Buenísimo" });
    const tortilla = await repo.upsertTag("tortilla");
    expect((await repo.upsertTag("tortilla")).id).toBe(tortilla.id);
    const vermut = await repo.upsertTag("vermut");
    await repo.setBarTags(barId, [
      { tagId: tortilla.id, rating: 5 },
      { tagId: vermut.id, rating: null },
    ]);
    await repo.addVisit(barId, "2026-10-17", "primera vez");

    const bars = await repo.listBars(city.id, "visited");
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({
      id: barId,
      googlePlaceId: details.googlePlaceId,
      name: "Bar Integración",
      cityId: city.id,
      status: "visited",
      ratingFood: 4.5,
      priceLevel: 2,
      notes: "Buenísimo",
      googleRating: 4.6,
      googleRatingCount: 321,
    });
    expect(bars[0].tags.map((t) => [t.name, t.rating]).sort()).toEqual([
      ["tortilla", 5],
      ["vermut", null],
    ]);
    expect(bars[0].visits).toMatchObject([{ date: "2026-10-17", note: "primera vez" }]);

    expect(await repo.listBars(city.id, "pending")).toEqual([]);
    expect((await repo.findBarByGooglePlaceId(details.googlePlaceId))?.id).toBe(barId);
    expect(await repo.listAllVisitedGooglePlaceIds()).toEqual(new Set([details.googlePlaceId]));
    expect((await repo.listTags()).map((t) => t.name)).toEqual(["tortilla", "vermut"]);

    // Replacing a tag set keeps exactly the new set with the new ratings.
    const queso = await repo.upsertTag("queso");
    await repo.setBarTags(barId, [
      { tagId: vermut.id, rating: 4 },
      { tagId: queso.id, rating: null },
    ]);
    expect((await repo.getBar(barId))!.tags.map((t) => [t.name, t.rating]).sort()).toEqual([
      ["queso", null],
      ["vermut", 4],
    ]);
    await repo.setBarTags(barId, []);
    expect((await repo.getBar(barId))!.tags).toEqual([]);

    await repo.updateBar(barId, { status: "pending", pendingReason: "volver" });
    expect((await repo.getBar(barId))?.status).toBe("pending");
    expect(await repo.listPendingGooglePlaceIds()).toEqual(new Set([details.googlePlaceId]));

    await repo.deleteBar(barId);
    expect(await repo.getBar(barId)).toBeNull();
  });

  it("works end to end through the service", async () => {
    const repo = createSupabaseBarsRepo(sb);
    const d: PlaceDetails = {
      ...details,
      googlePlaceId: "ChIJint-bar-2",
      name: "Otro Bar",
      addressComponents: [{ longText: "Vigo", shortText: "Vigo", types: ["locality", "political"] }],
    };
    const places = {
      autocomplete: async () => [],
      textSearch: async () => [],
      details: async () => d,
    } as unknown as PlacesClient;
    const service = createBarsService({ repo, places, details: places.details, today: () => "2026-10-17" });

    const first = await service.addVisitedBar(d.googlePlaceId, { tags: [{ name: " Croquetas ", rating: 4 }] });
    const second = await service.addVisitedBar(d.googlePlaceId, {});
    expect(first.existed).toBe(false);
    expect(second).toEqual({ barId: first.barId, existed: true, cityId: first.cityId, cityName: "Vigo" });

    const bar = await repo.getBar(first.barId);
    expect(bar?.cityId).toBe((await repo.findCityByName("Vigo"))?.id);
    expect(bar?.tags.map((t) => t.name)).toEqual(["croquetas"]);
    expect(bar?.visits).toHaveLength(1);
  });

  it("caches details for a place that is not a bar yet, and keeps city_id when it becomes one", async () => {
    const repo = createSupabaseBarsRepo(sb);
    const d: PlaceDetails = { ...details, googlePlaceId: "ChIJint-explore-only", name: "Candidato" };
    const client = { autocomplete: vi.fn(), textSearch: vi.fn(), details: vi.fn(async () => d) };
    const cached = createCachedDetails(client as unknown as PlacesClient, repo);

    expect(await repo.get(d.googlePlaceId)).toBeNull();
    expect((await cached(d.googlePlaceId)).name).toBe("Candidato");
    expect(client.details).toHaveBeenCalledTimes(1);

    const { data: row } = await sb.from("places").select("*").eq("google_place_id", d.googlePlaceId).single();
    expect(row).toMatchObject({ name: "Candidato", city_id: null, google_rating: 4.4, maps_url: d.mapsUrl });

    // Second call within the TTL is served from the cache.
    expect((await cached(d.googlePlaceId)).name).toBe("Candidato");
    expect(client.details).toHaveBeenCalledTimes(1);

    // Becoming a bar sets city_id; a later cache refresh must not clear it.
    const city = await repo.insertCity({ name: "Ferrol", googlePlaceId: "ChIJint-ferrol", location: { lat: 43.48, lng: -8.23 } });
    const place = await repo.upsertPlace(d, city.id);
    expect(place.city_id).toBe(city.id);
    await repo.put({ ...d, name: "Candidato 2" }, new Date());
    const { data: after } = await sb.from("places").select("*").eq("google_place_id", d.googlePlaceId).single();
    expect(after).toMatchObject({ id: place.id, city_id: city.id, name: "Candidato 2" });
  });
});
