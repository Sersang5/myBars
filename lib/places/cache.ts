import type { PlaceDetails, PlacesClient } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlaceStore {
  get(googlePlaceId: string): Promise<{ details: PlaceDetails; fetchedAt: Date } | null>;
  put(details: PlaceDetails, fetchedAt: Date): Promise<void>;
}

export function createCachedDetails(
  client: PlacesClient,
  store: PlaceStore,
  now: () => Date = () => new Date(),
  ttlDays = 7,
): (googlePlaceId: string) => Promise<PlaceDetails> {
  const ttlMs = ttlDays * DAY_MS;

  return async (googlePlaceId) => {
    const cached = await store.get(googlePlaceId);
    const current = now();

    if (cached && current.getTime() - cached.fetchedAt.getTime() < ttlMs) {
      return cached.details;
    }

    let details: PlaceDetails;
    try {
      details = await client.details(googlePlaceId);
    } catch (err) {
      if (cached) return cached.details;
      throw err;
    }

    await store.put(details, current);
    return details;
  };
}
