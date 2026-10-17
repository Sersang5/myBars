import type { PlaceDetails, PlaceSummary } from "@/lib/places/types";

export function summary(id: string, rating: number | null = 4, count = 100): PlaceSummary {
  return {
    googlePlaceId: id,
    name: "Bar " + id,
    address: "Calle " + id,
    location: { lat: 43.37, lng: -8.4 },
    rating,
    userRatingCount: count,
    priceLevel: 2,
    mapsUrl: "https://maps.example/" + id,
  };
}

export function detailsOf(s: PlaceSummary): PlaceDetails {
  return {
    ...s,
    addressComponents: [],
    reviews: [{ text: "muy bueno", rating: 5, relativeTime: "hace 1 mes" }],
    editorialSummary: null,
    openNow: true,
    photoRef: null,
  };
}
