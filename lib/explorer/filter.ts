import type { PlaceSummary } from "@/lib/places/types";

export type FilteredCandidate = PlaceSummary & { status: "visited" | "pending" | null };

export function filterCandidates(
  c: PlaceSummary[],
  visited: Set<string>,
  pending: Set<string>,
  newOnly: boolean,
): FilteredCandidate[] {
  const out: FilteredCandidate[] = [];
  for (const p of c) {
    const status = visited.has(p.googlePlaceId) ? "visited" : pending.has(p.googlePlaceId) ? "pending" : null;
    if (newOnly && status === "visited") continue;
    out.push({ ...p, status });
  }
  return out;
}
