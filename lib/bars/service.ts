import type { CityRow } from "@/lib/db/types";
import { extractCityName } from "@/lib/places/city";
import type { LatLng, PlaceDetails, PlacesClient } from "@/lib/places/types";
import type { BarFields, BarInput, BarsRepo } from "./repo";
import { normalizeTagName } from "./tags";
import type { Bar, Rating } from "./types";

const DEFAULT_CITY_CENTER: LatLng = { lat: 40.4168, lng: -3.7038 };
const CITY_RADIUS_M = 50000;

export type BarsServiceDeps = {
  repo: BarsRepo;
  places: PlacesClient;
  details: (id: string) => Promise<PlaceDetails>;
  /** ISO date, yyyy-mm-dd. */
  today: () => string;
};

/** Outcome of saving a bar; the city lets the UI tell when it landed outside the selected city. */
export type SaveResult = { barId: string; existed: boolean; cityId: string | null; cityName: string | null };

const FIELD_KEYS = ["ratingLocal", "ratingService", "ratingFood", "ratingOverallManual", "priceLevel", "notes"] as const;

function pickFields(input: BarInput): Partial<BarFields> {
  const out: Partial<BarFields> = {};
  for (const key of FIELD_KEYS) {
    if (input[key] !== undefined) (out as Record<string, unknown>)[key] = input[key];
  }
  return out;
}

/** Normalizes tag names and merges duplicates; the last rating wins. */
function dedupeTags(tags: NonNullable<BarInput["tags"]>): Map<string, Rating | null> {
  const byName = new Map<string, Rating | null>();
  for (const t of tags) byName.set(normalizeTagName(t.name), t.rating);
  return byName;
}

export function createBarsService({ repo, places, details, today }: BarsServiceDeps) {
  async function resolveCity(cityName: string, near?: LatLng): Promise<CityRow> {
    const existing = await repo.findCityByName(cityName);
    if (existing) return existing;

    const center = near ?? DEFAULT_CITY_CENTER;
    const [found] = await places.textSearch(
      cityName,
      { kind: "city", center, radiusM: CITY_RADIUS_M },
      { includedType: "locality", max: 1 },
    );

    if (found) {
      // The same Google city may already be stored under a different spelling.
      const sameGoogleCity = (await repo.listCities()).find((c) => c.google_place_id === found.googlePlaceId);
      if (sameGoogleCity) return sameGoogleCity;
      return repo.insertCity({ name: cityName, googlePlaceId: found.googlePlaceId, location: found.location });
    }
    return repo.insertCity({ name: cityName, googlePlaceId: `name:${cityName.toLowerCase()}`, location: center });
  }

  async function addCity(googlePlaceId: string): Promise<CityRow> {
    const existing = (await repo.listCities()).find((c) => c.google_place_id === googlePlaceId);
    if (existing) return existing;
    const d = await details(googlePlaceId);
    return repo.insertCity({ name: d.name, googlePlaceId, location: d.location });
  }

  async function applyTags(barId: string, tags: NonNullable<BarInput["tags"]>) {
    const merged = dedupeTags(tags);
    const rows: { tagId: string; rating: Rating | null }[] = [];
    for (const [name, rating] of merged) {
      const tag = await repo.upsertTag(name);
      rows.push({ tagId: tag.id, rating });
    }
    await repo.setBarTags(barId, rows);
  }

  async function createBar(
    googlePlaceId: string,
    status: "visited" | "pending",
    fields: Partial<BarFields>,
  ): Promise<SaveResult> {
    const d = await details(googlePlaceId);
    const cityName = extractCityName(d.addressComponents);
    const city = cityName ? await resolveCity(cityName, d.location) : null;
    const place = await repo.upsertPlace(d, city?.id ?? null);
    const barId = await repo.insertBar(place.id, status, fields);
    return { barId, existed: false, cityId: city?.id ?? null, cityName: city?.name ?? null };
  }

  async function existingResult(bar: Bar): Promise<SaveResult> {
    const city = bar.cityId ? (await repo.listCities()).find((c) => c.id === bar.cityId) : undefined;
    return { barId: bar.id, existed: true, cityId: bar.cityId, cityName: city?.name ?? null };
  }

  async function updateBar(barId: string, input: BarInput): Promise<void> {
    const fields = pickFields(input);
    if (Object.keys(fields).length > 0) await repo.updateBar(barId, fields);
    if (input.tags) await applyTags(barId, input.tags);
  }

  async function markVisited(barId: string, input: BarInput): Promise<void> {
    await repo.updateBar(barId, { ...pickFields(input), status: "visited", pendingReason: null });
    if (input.tags) await applyTags(barId, input.tags);
    await repo.addVisit(barId, today(), null);
  }

  async function addVisitedBar(googlePlaceId: string, input: BarInput): Promise<SaveResult> {
    const existing = await repo.findBarByGooglePlaceId(googlePlaceId);
    if (existing) {
      if (existing.status === "pending") await markVisited(existing.id, input);
      return existingResult(existing);
    }
    const created = await createBar(googlePlaceId, "visited", pickFields(input));
    if (input.tags) await applyTags(created.barId, input.tags);
    await repo.addVisit(created.barId, today(), null);
    return created;
  }

  async function addPendingBar(googlePlaceId: string, reason: string | null): Promise<SaveResult> {
    const existing = await repo.findBarByGooglePlaceId(googlePlaceId);
    if (existing) return existingResult(existing);
    return createBar(googlePlaceId, "pending", { pendingReason: reason });
  }

  return {
    resolveCity,
    addCity,
    addVisitedBar,
    addPendingBar,
    updateBar,
    markVisited,
    addVisit: (barId: string, note: string | null) => repo.addVisit(barId, today(), note),
    deleteBar: (barId: string) => repo.deleteBar(barId),
  };
}

export type BarsService = ReturnType<typeof createBarsService>;
