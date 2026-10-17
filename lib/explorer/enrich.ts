import type { LatLng, PlaceDetails } from "@/lib/places/types";
import { haversineM } from "./geo";
import { popularityScore } from "./search";
import type { FilteredCandidate } from "./filter";
import type { Candidate } from "./types";

export async function enrich(
  details: (id: string) => Promise<PlaceDetails>,
  c: FilteredCandidate[],
  center: LatLng,
  n = 12,
): Promise<Candidate[]> {
  const top = [...c].sort((a, b) => popularityScore(b) - popularityScore(a)).slice(0, n);
  const settled = await Promise.allSettled(top.map((p) => details(p.googlePlaceId)));
  const out: Candidate[] = [];
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    out.push({ ...s.value, status: top[i].status, distanceM: haversineM(center, s.value.location) });
  });
  return out;
}
