import autocompleteFixture from "@/tests/fixtures/places/autocomplete.json";
import detailsFixture from "@/tests/fixtures/places/details-bar.json";
import searchFixture from "@/tests/fixtures/places/search-tortilla.json";
import { mapPlaceDetails, mapPlaceSummary, mapSuggestions } from "./mappers";
import type { PlaceDetails, PlaceSummary, PlacesClient, Suggestion } from "./types";

/** Fixed id of the fake "A Coruña" locality, used for city creation. */
export const FAKE_CITY_ID = "ChIJfakeCoruna";

/** Fixed id of the fake "Oleiros" locality, a second city for out-of-city saves. */
export const FAKE_SECOND_CITY_ID = "ChIJfakeOleiros";

/** A suggestion whose details resolve to Oleiros instead of A Coruña. */
export const FAKE_OLEIROS_BAR_ID = "ChIJbarOleiros";

const CITY_LOCATION = { lat: 43.3623, lng: -8.4115 };
const OLEIROS_LOCATION = { lat: 43.3333, lng: -8.3167 };

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

const OLEIROS_SUMMARY: PlaceSummary = {
  googlePlaceId: FAKE_SECOND_CITY_ID,
  name: "Oleiros",
  address: "Oleiros, A Coruña, España",
  location: OLEIROS_LOCATION,
  rating: null,
  userRatingCount: 0,
  priceLevel: null,
  mapsUrl: "https://maps.google.com/?cid=fake-oleiros",
};

const OLEIROS_BAR_SUGGESTION: Suggestion = {
  googlePlaceId: FAKE_OLEIROS_BAR_ID,
  mainText: "Bar Oleiros",
  secondaryText: "Rúa do Mar 3, Oleiros, España",
};

/**
 * A PlacesClient that serves the recorded fixtures instead of calling Google.
 * Only for local development and E2E tests (see getDeps).
 */
export function createFakePlacesClient(): PlacesClient {
  const suggestions = [...mapSuggestions(autocompleteFixture), OLEIROS_BAR_SUGGESTION];

  return {
    async autocomplete(_input, _bias, opts) {
      if (opts?.types?.includes("locality")) return [CITY_SUGGESTION];
      return suggestions;
    },

    async textSearch(query, _scope, opts) {
      if (opts?.includedType === "locality") {
        return [query.toLowerCase().includes("oleiros") ? OLEIROS_SUMMARY : CITY_SUMMARY];
      }
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
      if (googlePlaceId === FAKE_OLEIROS_BAR_ID) {
        return {
          ...base,
          googlePlaceId,
          name: OLEIROS_BAR_SUGGESTION.mainText,
          address: OLEIROS_BAR_SUGGESTION.secondaryText,
          location: OLEIROS_LOCATION,
          mapsUrl: `https://maps.google.com/?cid=${googlePlaceId}`,
          addressComponents: [
            { longText: "Oleiros", shortText: "Oleiros", types: ["locality", "political"] },
            { longText: "A Coruña", shortText: "C", types: ["administrative_area_level_2", "political"] },
          ],
        };
      }
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
