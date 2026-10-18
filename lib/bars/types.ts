import type { LatLng } from "@/lib/places/types";

export type Rating = number; // 1–5, step 0.5

export type BarTag = { tagId: string; name: string; rating: Rating | null };

export type Bar = {
  id: string;
  placeId: string;
  googlePlaceId: string;
  name: string;
  address: string;
  cityId: string | null;
  location: LatLng;
  mapsUrl: string;
  googleRating: number | null;
  googleRatingCount: number;
  status: "visited" | "pending";
  ratingLocal: Rating | null;
  ratingService: Rating | null;
  ratingFood: Rating | null;
  ratingOverallManual: Rating | null;
  priceLevel: 1 | 2 | 3 | 4 | null;
  notes: string;
  pendingReason: string | null;
  tags: BarTag[];
  visits: { id: string; date: string; note: string | null }[];
  createdAt: string;
};

export type BarFilters = {
  text?: string;
  tagIds?: string[];
  minOverall?: number;
  minLocal?: number;
  minService?: number;
  minFood?: number;
  priceLevels?: number[];
  visitedWithinMonths?: number;
};

export type BarSort = "overall" | "tag" | "recent" | "visits" | "name";

/** A tag with how many of my bars (any city, any status) use it. */
export type TagSummary = { id: string; name: string; barCount: number };

export type TagFilterOption = { id: string; name: string; count: number };
