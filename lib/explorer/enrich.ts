import { PlacesError, type LatLng, type PlaceDetails } from "@/lib/places/types";
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
  // Every call failing is an outage (auth, quota...), not "no results": let the route map it.
  const first = settled[0];
  if (
    first?.status === "rejected" &&
    first.reason instanceof PlacesError &&
    settled.every((r) => r.status === "rejected")
  ) {
    throw first.reason;
  }
  const out: Candidate[] = [];
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    out.push({ ...s.value, status: top[i].status, distanceM: haversineM(center, s.value.location) });
  });
  return out;
}
