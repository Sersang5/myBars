import type { PlaceStore } from "@/lib/places/cache";
import type { LatLng, PlaceDetails } from "@/lib/places/types";
import type { CityRow, PlaceRow, TagRow } from "@/lib/db/types";
import type { Bar, Rating } from "./types";

export type BarFields = {
  ratingLocal: Rating | null;
  ratingService: Rating | null;
  ratingFood: Rating | null;
  ratingOverallManual: Rating | null;
  priceLevel: 1 | 2 | 3 | 4 | null;
  notes: string;
  pendingReason: string | null;
  status: "visited" | "pending";
};

export type BarInput = Partial<Omit<BarFields, "status" | "pendingReason">> & {
  tags?: { name: string; rating: Rating | null }[];
};

export interface BarsRepo extends PlaceStore {
  findCityByName(name: string): Promise<CityRow | null>;
  insertCity(c: { name: string; googlePlaceId: string; location: LatLng }): Promise<CityRow>;
  listCities(): Promise<CityRow[]>;
  upsertPlace(d: PlaceDetails, cityId: string | null): Promise<PlaceRow>;
  findBarByGooglePlaceId(googlePlaceId: string): Promise<Bar | null>;
  insertBar(placeId: string, status: "visited" | "pending", fields: Partial<BarFields>): Promise<string>;
  updateBar(id: string, fields: Partial<BarFields>): Promise<void>;
  deleteBar(id: string): Promise<void>;
  listBars(cityId: string, status: "visited" | "pending"): Promise<Bar[]>;
  listAllVisitedGooglePlaceIds(): Promise<Set<string>>;
  listPendingGooglePlaceIds(): Promise<Set<string>>;
  getBar(id: string): Promise<Bar | null>;
  /** `name` must already be normalized. */
  upsertTag(name: string): Promise<TagRow>;
  listTags(): Promise<TagRow[]>;
  setBarTags(barId: string, tags: { tagId: string; rating: Rating | null }[]): Promise<void>;
  addVisit(barId: string, date: string, note: string | null): Promise<void>;
}
