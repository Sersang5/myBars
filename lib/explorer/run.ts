import { errorKind, type Llm } from "@/lib/llm/client";
import type { LocationScope, PlaceDetails, PlacesClient } from "@/lib/places/types";
import { enrich } from "./enrich";
import { filterCandidates } from "./filter";
import { haversineM } from "./geo";
import { interpret } from "./interpret";
import { rank } from "./rank";
import { popularityScore, search } from "./search";
import type { Candidate, Intent, OwnBarContext, RankedResult } from "./types";

export type ExploreRequest = { prompt: string; scope: LocationScope; novelty: "auto" | "new" | "include" };

export type ExploreResult = {
  googlePlaceId: string;
  name: string;
  address: string;
  mapsUrl: string;
  rating: number | null;
  userRatingCount: number;
  priceLevel: 1 | 2 | 3 | 4 | null;
  distanceM: number;
  openNow: boolean | null;
  reason: string | null;
  quote: string | null;
  status: "visited" | "pending" | null;
};

export type ExploreResponse = {
  results: ExploreResult[];
  intent: Intent;
  degraded: boolean;
  message: string | null;
};

export type ExploreDeps = {
  llm: Llm;
  places: PlacesClient;
  details: (id: string) => Promise<PlaceDetails>;
  visitedIds: Set<string>;
  pendingIds: Set<string>;
  ownBars: OwnBarContext[];
};

const MAX_RESULTS = 8;
const NO_RESULTS_MESSAGE = "No encontré sitios para eso. Prueba a ampliar el radio o reformular la búsqueda.";
const DEGRADED_MESSAGE = "No se pudo analizar las reseñas; resultados ordenados por valoración de Google.";

function fromCandidate(c: Candidate, reason: string | null, quote: string | null): ExploreResult {
  return {
    googlePlaceId: c.googlePlaceId,
    name: c.name,
    address: c.address,
    mapsUrl: c.mapsUrl,
    rating: c.rating,
    userRatingCount: c.userRatingCount,
    priceLevel: c.priceLevel,
    distanceM: c.distanceM,
    openNow: c.openNow,
    reason,
    quote,
    status: c.status,
  };
}

function fromOwnBar(o: OwnBarContext, r: RankedResult, center: LocationScope["center"]): ExploreResult {
  return {
    googlePlaceId: o.googlePlaceId,
    name: o.name,
    address: o.address,
    mapsUrl: o.mapsUrl,
    rating: o.googleRating,
    userRatingCount: o.googleRatingCount,
    priceLevel: o.priceLevel,
    distanceM: haversineM(center, o.location),
    openNow: null,
    reason: r.reason,
    quote: r.quote,
    status: "visited",
  };
}

export async function runExplore(deps: ExploreDeps, req: ExploreRequest): Promise<ExploreResponse> {
  const prompt = req.prompt.trim();
  if (!prompt) throw new Error("empty_prompt");

  const intent = await interpret(deps.llm, prompt);
  const newOnly = req.novelty === "new" ? true : req.novelty === "include" ? false : intent.wantsNewOnly;
  const own = newOnly ? [] : deps.ownBars;

  // A PlacesError from search (all queries failed) propagates so the route can map it.
  const found = await search(deps.places, intent.searchQueries, req.scope);
  const filtered = filterCandidates(found, deps.visitedIds, deps.pendingIds, newOnly);
  const candidates = await enrich(deps.details, filtered, req.scope.center);

  if (candidates.length === 0) {
    return { results: [], intent, degraded: false, message: NO_RESULTS_MESSAGE };
  }

  let ranked: RankedResult[] | null = null;
  try {
    ranked = await rank(deps.llm, prompt, intent, candidates, own);
  } catch (e) {
    console.error("[explore] rank failed", errorKind(e), e instanceof Error ? e.message : String(e));
  }

  if (ranked) {
    const byId = new Map(candidates.map((c) => [c.googlePlaceId, c]));
    const ownById = new Map(own.map((o) => [o.googlePlaceId, o]));
    const results: ExploreResult[] = [];
    for (const r of ranked) {
      const c = byId.get(r.googlePlaceId);
      if (c) {
        results.push(fromCandidate(c, r.reason, r.quote));
        continue;
      }
      const o = ownById.get(r.googlePlaceId);
      if (o) results.push(fromOwnBar(o, r, req.scope.center));
    }
    if (results.length > 0) return { results, intent, degraded: false, message: null };
  }

  const results = [...candidates]
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, MAX_RESULTS)
    .map((c) => fromCandidate(c, null, null));
  return { results, intent, degraded: true, message: DEGRADED_MESSAGE };
}
