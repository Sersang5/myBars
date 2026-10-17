import { describe, expect, it, vi } from "vitest";
import { createCachedDetails, type PlaceStore } from "@/lib/places/cache";
import { PlacesError, type PlaceDetails, type PlacesClient } from "@/lib/places/types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-17T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY);

const details: PlaceDetails = {
  googlePlaceId: "place-1",
  name: "Bar Test",
  address: "Calle Falsa 1",
  location: { lat: 43.37, lng: -8.4 },
  rating: 4.5,
  userRatingCount: 120,
  priceLevel: 2,
  mapsUrl: "https://maps.google.com/?cid=1",
  addressComponents: [],
  reviews: [],
  editorialSummary: null,
  openNow: true,
  photoRef: null,
};

function fakeClient(result: PlaceDetails | Error) {
  const client = {
    autocomplete: vi.fn(),
    textSearch: vi.fn(),
    details: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
  return client satisfies PlacesClient & Record<string, unknown>;
}

function fakeStore(entry: { details: PlaceDetails; fetchedAt: Date } | null = null) {
  return {
    get: vi.fn(async () => entry),
    put: vi.fn(async () => undefined),
  } satisfies PlaceStore;
}

describe("createCachedDetails", () => {
  it("serves a fresh entry (6 days old) without calling the client", async () => {
    const client = fakeClient(details);
    const store = fakeStore({ details, fetchedAt: daysAgo(6) });
    const getDetails = createCachedDetails(client, store, () => NOW);

    const res = await getDetails("place-1");

    expect(res).toEqual(details);
    expect(store.get).toHaveBeenCalledWith("place-1");
    expect(client.details).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("refreshes an expired entry (8 days old) and stores it with now()", async () => {
    const fresh = { ...details, rating: 4.8 };
    const client = fakeClient(fresh);
    const store = fakeStore({ details, fetchedAt: daysAgo(8) });
    const getDetails = createCachedDetails(client, store, () => NOW);

    const res = await getDetails("place-1");

    expect(res).toEqual(fresh);
    expect(client.details).toHaveBeenCalledWith("place-1");
    expect(store.put).toHaveBeenCalledWith(fresh, NOW);
  });

  it("fetches and stores when there is no entry", async () => {
    const client = fakeClient(details);
    const store = fakeStore(null);
    const getDetails = createCachedDetails(client, store, () => NOW);

    const res = await getDetails("place-1");

    expect(res).toEqual(details);
    expect(client.details).toHaveBeenCalledWith("place-1");
    expect(store.put).toHaveBeenCalledWith(details, NOW);
  });

  it("returns the stale entry without storing when the client fails", async () => {
    const stale = { ...details, rating: 3.0 };
    const client = fakeClient(new PlacesError("network", "down"));
    const store = fakeStore({ details: stale, fetchedAt: daysAgo(10) });
    const getDetails = createCachedDetails(client, store, () => NOW);

    const res = await getDetails("place-1");

    expect(res).toEqual(stale);
    expect(client.details).toHaveBeenCalledTimes(1);
    expect(store.put).not.toHaveBeenCalled();
  });

  it("rethrows the PlacesError when the client fails and there is no entry", async () => {
    const err = new PlacesError("quota", "exceeded");
    const client = fakeClient(err);
    const store = fakeStore(null);
    const getDetails = createCachedDetails(client, store, () => NOW);

    await expect(getDetails("place-1")).rejects.toBe(err);
    expect(store.put).not.toHaveBeenCalled();
  });

  it("honours a custom ttlDays", async () => {
    const client = fakeClient(details);
    const store = fakeStore({ details, fetchedAt: daysAgo(2) });
    const getDetails = createCachedDetails(client, store, () => NOW, 1);

    await getDetails("place-1");

    expect(client.details).toHaveBeenCalledTimes(1);
    expect(store.put).toHaveBeenCalledWith(details, NOW);
  });
});
