import "server-only";
import { createBarsService } from "@/lib/bars/service";
import { createSupabaseBarsRepo } from "@/lib/bars/repo.supabase";
import type { BarsRepo } from "@/lib/bars/repo";
import { createServerSupabase } from "@/lib/db/server";
import { getServerEnv } from "@/lib/env";
import { createClaudeLlm, type Llm } from "@/lib/llm/client";
import { createCachedDetails } from "@/lib/places/cache";
import { createPlacesClient } from "@/lib/places/client";
import { madridToday } from "./today";
import type { PlaceDetails, PlacesClient } from "@/lib/places/types";

/** Fixture-backed Places for E2E/dev; never active in production builds. */
async function createPlaces(apiKey: string): Promise<PlacesClient> {
  if (process.env.PLACES_FAKE === "1" && process.env.NODE_ENV !== "production") {
    const { createFakePlacesClient } = await import("@/lib/places/fake");
    return createFakePlacesClient();
  }
  return createPlacesClient(apiKey);
}

export async function getDeps(): Promise<{
  repo: BarsRepo;
  places: PlacesClient;
  details: (id: string) => Promise<PlaceDetails>;
  llm: Llm;
  service: ReturnType<typeof createBarsService>;
}> {
  const env = getServerEnv();
  const sb = await createServerSupabase();
  const repo = createSupabaseBarsRepo(sb);
  const places = await createPlaces(env.GOOGLE_MAPS_API_KEY);
  const details = createCachedDetails(places, repo);
  const service = createBarsService({ repo, places, details, today: madridToday });
  const llm = createClaudeLlm(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  return { repo, places, details, llm, service };
}
