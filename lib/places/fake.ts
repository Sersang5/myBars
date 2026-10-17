import autocompleteFixture from "@/tests/fixtures/places/autocomplete.json";
import detailsFixture from "@/tests/fixtures/places/details-bar.json";
import searchFixture from "@/tests/fixtures/places/search-tortilla.json";
import { mapPlaceDetails, mapPlaceSummary, mapSuggestions } from "./mappers";
import type { PlaceDetails, PlaceSummary, PlacesClient, Suggestion } from "./types";

/** Fixed id of the fake "A Coruña" locality, used for city creation. */
export const FAKE_CITY_ID = "ChIJfakeCoruna";

const CITY_LOCATION = { lat: 43.3623, lng: -8.4115 };

const CITY_SUGGESTION: Suggestion = {
  googlePlaceId: FAKE_CITY_ID,
  mainText: "A Coruña",
  secondaryText: "Galicia, España",
};

const CITY_SUMMARY: PlaceSummary = {
  googlePlaceId: FAKE_CITY_ID,
  name: "A Coruña",
  address: "A Coruña, España",
  location: CITY_LOCATION,
  rating: null,
  userRatingCount: 0,
  priceLevel: null,
  mapsUrl: "https://maps.google.com/?cid=fake-city",
};

/**
 * A PlacesClient that serves the recorded fixtures instead of calling Google.
 * Only for local development and E2E tests (see getDeps).
 */
export function createFakePlacesClient(): PlacesClient {
  const suggestions = mapSuggestions(autocompleteFixture);

  return {
    async autocomplete(_input, _bias, opts) {
      if (opts?.types?.includes("locality")) return [CITY_SUGGESTION];
      return suggestions;
    },

    async textSearch(_query, _scope, opts) {
      if (opts?.includedType === "locality") return [CITY_SUMMARY];
      return (searchFixture.places as unknown[]).map(mapPlaceSummary);
    },

    async details(googlePlaceId): Promise<PlaceDetails> {
      const base = mapPlaceDetails(detailsFixture);
      if (googlePlaceId === FAKE_CITY_ID) {
        return {
          ...CITY_SUMMARY,
          addressComponents: [
            { longText: "A Coruña", shortText: "A Coruña", types: ["locality", "political"] },
          ],
          reviews: [],
          editorialSummary: null,
          openNow: null,
          photoRef: null,
        };
      }
      const s = suggestions.find((x) => x.googlePlaceId === googlePlaceId);
      return {
        ...base,
        googlePlaceId,
        name: s?.mainText ?? googlePlaceId,
        address: s?.secondaryText || base.address,
        mapsUrl: `https://maps.google.com/?cid=${encodeURIComponent(googlePlaceId)}`,
      };
    },
  };
}
