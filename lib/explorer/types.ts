import type { BarTag } from "@/lib/bars/types";
import type { LatLng, PlaceDetails } from "@/lib/places/types";

export type Intent = {
  searchQueries: string[];
  wantsNewOnly: boolean;
  reviewSignals: string[];
};

export type Candidate = PlaceDetails & {
  status: "visited" | "pending" | null;
  distanceM: number;
};

export type OwnBarContext = {
  googlePlaceId: string;
  name: string;
  overall: number | null;
  tags: BarTag[];
  notes: string;
  address: string;
  mapsUrl: string;
  location: LatLng;
  googleRating: number | null;
  googleRatingCount: number;
  priceLevel: 1 | 2 | 3 | 4 | null;
};

export type RankedResult = {
  googlePlaceId: string;
  score: number;
  reason: string;
  quote: string | null;
};
