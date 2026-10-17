import { mapPlaceDetails, mapPlaceSummary, mapSuggestions } from "./mappers";
import {
  PlacesError,
  type LatLng,
  type PlacesClient,
  type PlacesErrorKind,
} from "./types";

const BASE = "https://places.googleapis.com/v1";
const LANGUAGE = "es";
const MAX_PAGE_SIZE = 20;
const AUTOCOMPLETE_RADIUS_M = 50000;

const SEARCH_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.googleMapsUri",
].join(",");

const DETAILS_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "googleMapsUri",
  "addressComponents",
  "reviews",
  "editorialSummary",
  "currentOpeningHours.openNow",
  "photos",
].join(",");

const AUTOCOMPLETE_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat";

const MAX_BIAS_RADIUS_M = 50000;

function circle(center: LatLng, radius: number) {
  return {
    circle: {
      center: { latitude: center.lat, longitude: center.lng },
      radius: Math.min(radius, MAX_BIAS_RADIUS_M),
    },
  };
}

function kindForStatus(status: number): PlacesErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "quota";
  if (status === 404) return "not_found";
  return "unknown";
}

export function createPlacesClient(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): PlacesClient {
  async function request(
    url: string,
    method: "GET" | "POST",
    mask: string,
    body?: unknown,
  ) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": mask,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new PlacesError(
        "network",
        e instanceof Error ? e.message : "network error",
      );
    }
    if (!res.ok)
      throw new PlacesError(
        kindForStatus(res.status),
        `Places API HTTP ${res.status}`,
      );
    try {
      return await res.json();
    } catch {
      throw new PlacesError("unknown", "Invalid JSON from Places API");
    }
  }

  return {
    async autocomplete(input, bias, opts) {
      const body: Record<string, unknown> = { input, languageCode: LANGUAGE };
      if (bias) body.locationBias = circle(bias, AUTOCOMPLETE_RADIUS_M);
      if (opts?.types?.length) body.includedPrimaryTypes = opts.types;
      return mapSuggestions(
        await request(
          `${BASE}/places:autocomplete`,
          "POST",
          AUTOCOMPLETE_MASK,
          body,
        ),
      );
    },

    async textSearch(query, scope, opts) {
      const body: Record<string, unknown> = {
        textQuery: query,
        languageCode: LANGUAGE,
        pageSize: Math.max(
          1,
          Math.min(opts?.max ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
        ),
        locationBias: circle(scope.center, scope.radiusM),
      };
      if (opts?.includedType) body.includedType = opts.includedType;
      const res = await request(
        `${BASE}/places:searchText`,
        "POST",
        SEARCH_MASK,
        body,
      );
      return ((res?.places ?? []) as unknown[]).map(mapPlaceSummary);
    },

    async details(googlePlaceId) {
      const url = `${BASE}/places/${encodeURIComponent(googlePlaceId)}?languageCode=${LANGUAGE}`;
      return mapPlaceDetails(await request(url, "GET", DETAILS_MASK));
    },
  };
}
