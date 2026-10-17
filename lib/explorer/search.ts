import type { LocationScope, PlaceSummary, PlacesClient } from "@/lib/places/types";

export function popularityScore(p: { rating: number | null; userRatingCount: number }): number {
  return (p.rating ?? 0) * Math.log10(p.userRatingCount + 1);
}

export async function search(
  places: PlacesClient,
  queries: string[],
  scope: LocationScope,
  max = 40,
): Promise<PlaceSummary[]> {
  const settled = await Promise.allSettled(queries.map((q) => places.textSearch(q, scope)));
  const seen = new Set<string>();
  const out: PlaceSummary[] = [];
  let firstError: unknown = null;
  let anyOk = false;
  for (const s of settled) {
    if (s.status === "rejected") {
      firstError ??= s.reason;
      continue;
    }
    anyOk = true;
    for (const p of s.value) {
      if (seen.has(p.googlePlaceId)) continue;
      seen.add(p.googlePlaceId);
      out.push(p);
    }
  }
  if (!anyOk && firstError) throw firstError;
  return out.slice(0, max);
}
