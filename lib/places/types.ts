export type LatLng = { lat: number; lng: number };

export type LocationScope =
  | { kind: "city"; center: LatLng; radiusM: number }
  | { kind: "near"; center: LatLng; radiusM: number };

export type Review = { text: string; rating: number; relativeTime: string; author?: string };

export type AddressComponent = { longText: string; shortText: string; types: string[] };

export type PlaceSummary = {
  googlePlaceId: string;
  name: string;
  address: string;
  location: LatLng;
  rating: number | null;
  userRatingCount: number;
  priceLevel: 1 | 2 | 3 | 4 | null;
  mapsUrl: string;
};

export type PlaceDetails = PlaceSummary & {
  addressComponents: AddressComponent[];
  reviews: Review[];
  editorialSummary: string | null;
  openNow: boolean | null;
  photoRef: string | null;
};

export type Suggestion = { googlePlaceId: string; mainText: string; secondaryText: string };

export interface PlacesClient {
  autocomplete(input: string, bias: LatLng | null, opts?: { types?: string[] }): Promise<Suggestion[]>;
  textSearch(
    query: string,
    scope: LocationScope,
    opts?: { includedType?: string; max?: number },
  ): Promise<PlaceSummary[]>;
  details(googlePlaceId: string): Promise<PlaceDetails>;
}

export type PlacesErrorKind = "auth" | "quota" | "not_found" | "network" | "unknown";

export class PlacesError extends Error {
  kind: PlacesErrorKind;
  constructor(kind: PlacesErrorKind, message: string) {
    super(message);
    this.name = "PlacesError";
    this.kind = kind;
  }
}

export interface ReviewSource {
  getReviews(details: PlaceDetails): Review[];
}
