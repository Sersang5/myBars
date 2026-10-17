import type { AddressComponent, PlaceDetails, PlaceSummary, Review, Suggestion } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

export function mapPriceLevel(s: string | undefined): 1 | 2 | 3 | 4 | null {
  switch (s) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return null;
  }
}

export function mapPlaceSummary(p: Raw): PlaceSummary {
  return {
    googlePlaceId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    location: { lat: p.location?.latitude ?? 0, lng: p.location?.longitude ?? 0 },
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? 0,
    priceLevel: mapPriceLevel(p.priceLevel),
    mapsUrl: p.googleMapsUri ?? "",
  };
}

export function mapReview(r: Raw): Review {
  const review: Review = {
    text: r.text?.text ?? r.originalText?.text ?? "",
    rating: r.rating ?? 0,
    relativeTime: r.relativeTimeDescription ?? "",
  };
  const author = r.authorAttribution?.displayName;
  if (author) review.author = author;
  return review;
}

export function mapPlaceDetails(p: Raw): PlaceDetails {
  return {
    ...mapPlaceSummary(p),
    addressComponents: ((p.addressComponents ?? []) as Raw[]).map(
      (c): AddressComponent => ({
        longText: c.longText ?? "",
        shortText: c.shortText ?? "",
        types: c.types ?? [],
      }),
    ),
    reviews: ((p.reviews ?? []) as Raw[]).map(mapReview),
    editorialSummary: p.editorialSummary?.text ?? null,
    openNow: p.currentOpeningHours?.openNow ?? null,
    photoRef: p.photos?.[0]?.name ?? null,
  };
}

export function mapSuggestions(res: Raw): Suggestion[] {
  return ((res?.suggestions ?? []) as Raw[])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      googlePlaceId: s.placePrediction.placeId,
      mainText: s.placePrediction.structuredFormat?.mainText?.text ?? "",
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
    }));
}
