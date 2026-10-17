import type { CityRow, PlaceRow, TagRow } from "@/lib/db/types";
import type { PlaceDetails } from "@/lib/places/types";
import type { BarFields, BarsRepo } from "./repo";
import type { Bar, Rating } from "./types";

type BarRecord = BarFields & { id: string; placeId: string; createdAt: string };

const DEFAULT_FIELDS: Omit<BarFields, "status"> = {
  ratingLocal: null,
  ratingService: null,
  ratingFood: null,
  ratingOverallManual: null,
  priceLevel: null,
  notes: "",
  pendingReason: null,
};

/** In-memory BarsRepo for unit tests only. */
export function createMemoryBarsRepo(): BarsRepo & {
  counts(): { cities: number; places: number; bars: number; visits: number };
} {
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${++seq}`;
  const stamp = () => new Date(2026, 0, 1, 0, 0, seq).toISOString();

  const cities = new Map<string, CityRow>();
  const places = new Map<string, PlaceRow>();
  const bars = new Map<string, BarRecord>();
  const tags = new Map<string, TagRow>();
  const barTags = new Map<string, Map<string, Rating | null>>();
  const visits = new Map<string, { id: string; date: string; note: string | null }[]>();

  function toBar(rec: BarRecord): Bar {
    const place = places.get(rec.placeId)!;
    return {
      id: rec.id,
      placeId: place.id,
      googlePlaceId: place.google_place_id,
      name: place.name,
      address: place.address ?? "",
      cityId: place.city_id,
      location: { lat: place.lat ?? 0, lng: place.lng ?? 0 },
      mapsUrl: place.maps_url ?? "",
      googleRating: place.google_rating,
      googleRatingCount: place.google_user_rating_count ?? 0,
      status: rec.status,
      ratingLocal: rec.ratingLocal,
      ratingService: rec.ratingService,
      ratingFood: rec.ratingFood,
      ratingOverallManual: rec.ratingOverallManual,
      priceLevel: rec.priceLevel,
      notes: rec.notes,
      pendingReason: rec.pendingReason,
      tags: [...(barTags.get(rec.id) ?? new Map<string, Rating | null>()).entries()].map(([tagId, rating]) => ({
        tagId,
        name: tags.get(tagId)!.name,
        rating,
      })),
      visits: [...(visits.get(rec.id) ?? [])],
      createdAt: rec.createdAt,
    };
  }

  const placeByGoogleId = (gid: string) => [...places.values()].find((p) => p.google_place_id === gid);

  return {
    async get(googlePlaceId) {
      const p = placeByGoogleId(googlePlaceId);
      if (!p || !p.details_json || !p.details_fetched_at) return null;
      return { details: p.details_json as PlaceDetails, fetchedAt: new Date(p.details_fetched_at) };
    },
    async put(details, fetchedAt) {
      const p = placeByGoogleId(details.googlePlaceId);
      if (!p) return;
      p.details_json = details;
      p.details_fetched_at = fetchedAt.toISOString();
    },
    async findCityByName(name) {
      const n = name.toLowerCase();
      return [...cities.values()].find((c) => c.name.toLowerCase() === n) ?? null;
    },
    async insertCity(c) {
      const row: CityRow = {
        id: nextId("city"),
        user_id: "user",
        created_at: stamp(),
        name: c.name,
        google_place_id: c.googlePlaceId,
        lat: c.location.lat,
        lng: c.location.lng,
      };
      cities.set(row.id, row);
      return row;
    },
    async listCities() {
      return [...cities.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    async upsertPlace(d, cityId) {
      const existing = placeByGoogleId(d.googlePlaceId);
      const row: PlaceRow = {
        id: existing?.id ?? nextId("place"),
        user_id: "user",
        created_at: existing?.created_at ?? stamp(),
        google_place_id: d.googlePlaceId,
        name: d.name,
        address: d.address,
        city_id: cityId,
        lat: d.location.lat,
        lng: d.location.lng,
        google_rating: d.rating,
        google_user_rating_count: d.userRatingCount,
        google_price_level: d.priceLevel,
        maps_url: d.mapsUrl,
        photo_ref: d.photoRef,
        details_json: existing?.details_json ?? null,
        details_fetched_at: existing?.details_fetched_at ?? null,
      };
      places.set(row.id, row);
      return row;
    },
    async findBarByGooglePlaceId(googlePlaceId) {
      const p = placeByGoogleId(googlePlaceId);
      if (!p) return null;
      const rec = [...bars.values()].find((b) => b.placeId === p.id);
      return rec ? toBar(rec) : null;
    },
    async insertBar(placeId, status, fields) {
      const id = nextId("bar");
      bars.set(id, { ...DEFAULT_FIELDS, ...fields, status, id, placeId, createdAt: stamp() });
      return id;
    },
    async updateBar(id, fields) {
      const rec = bars.get(id);
      if (!rec) throw new Error(`Bar not found: ${id}`);
      Object.assign(rec, fields);
    },
    async deleteBar(id) {
      bars.delete(id);
      barTags.delete(id);
      visits.delete(id);
    },
    async listBars(cityId, status) {
      return [...bars.values()]
        .filter((b) => b.status === status && places.get(b.placeId)?.city_id === cityId)
        .map(toBar);
    },
    async listAllVisitedGooglePlaceIds() {
      return new Set(
        [...bars.values()].filter((b) => b.status === "visited").map((b) => places.get(b.placeId)!.google_place_id),
      );
    },
    async listPendingGooglePlaceIds() {
      return new Set(
        [...bars.values()].filter((b) => b.status === "pending").map((b) => places.get(b.placeId)!.google_place_id),
      );
    },
    async getBar(id) {
      const rec = bars.get(id);
      return rec ? toBar(rec) : null;
    },
    async upsertTag(name) {
      const existing = [...tags.values()].find((t) => t.name === name);
      if (existing) return existing;
      const row: TagRow = { id: nextId("tag"), user_id: "user", created_at: stamp(), name };
      tags.set(row.id, row);
      return row;
    },
    async listTags() {
      return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    async setBarTags(barId, list) {
      barTags.set(barId, new Map(list.map((t) => [t.tagId, t.rating])));
    },
    async addVisit(barId, date, note) {
      const list = visits.get(barId) ?? [];
      list.push({ id: nextId("visit"), date, note });
      visits.set(barId, list);
    },
    counts() {
      return {
        cities: cities.size,
        places: places.size,
        bars: bars.size,
        visits: [...visits.values()].reduce((n, v) => n + v.length, 0),
      };
    },
  };
}
