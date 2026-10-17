import { describe, expect, it } from "vitest";
import { createMemoryBarsRepo } from "@/lib/bars/repo.memory";
import type { PlaceDetails } from "@/lib/places/types";

const d: PlaceDetails = {
  googlePlaceId: "ChIJmem",
  name: "Candidato",
  address: "Calle 1",
  location: { lat: 43, lng: -8 },
  rating: 4.2,
  userRatingCount: 10,
  priceLevel: 2,
  mapsUrl: "https://maps.google.com/?cid=1",
  addressComponents: [],
  reviews: [],
  editorialSummary: null,
  openNow: null,
  photoRef: null,
};

describe("memory PlaceStore.put", () => {
  it("inserts a minimal place for an unknown id and keeps city_id on existing rows", async () => {
    const repo = createMemoryBarsRepo();
    const at = new Date("2026-10-10T00:00:00Z");
    await repo.put(d, at);
    expect(await repo.get(d.googlePlaceId)).toEqual({ details: d, fetchedAt: at });
    expect(repo.counts().places).toBe(1);

    const city = await repo.insertCity({ name: "A Coruña", googlePlaceId: "c", location: d.location });
    const place = await repo.upsertPlace(d, city.id);
    expect(place.city_id).toBe(city.id);
    await repo.put({ ...d, name: "Nuevo" }, at);
    const barId = await repo.insertBar(place.id, "pending", {});
    expect(await repo.getBar(barId)).toMatchObject({ cityId: city.id, name: "Nuevo" });
    expect(repo.counts().places).toBe(1);
  });
});
