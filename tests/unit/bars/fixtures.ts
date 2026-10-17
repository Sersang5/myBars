import type { Bar } from "@/lib/bars/types";

export function makeBar(over: Partial<Bar> = {}): Bar {
  return {
    id: "b1",
    placeId: "p1",
    googlePlaceId: "g1",
    name: "Bar",
    address: "Calle 1",
    cityId: null,
    location: { lat: 0, lng: 0 },
    mapsUrl: "https://maps.example/1",
    googleRating: null,
    googleRatingCount: 0,
    status: "visited",
    ratingLocal: null,
    ratingService: null,
    ratingFood: null,
    ratingOverallManual: null,
    priceLevel: null,
    notes: "",
    pendingReason: null,
    tags: [],
    visits: [],
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}
