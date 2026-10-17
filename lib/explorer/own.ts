import { overallRating } from "@/lib/bars/rating";
import type { Bar } from "@/lib/bars/types";
import type { LocationScope } from "@/lib/places/types";
import { haversineM } from "./geo";
import type { OwnBarContext } from "./types";

export function toOwnBarContext(bar: Bar): OwnBarContext {
  return {
    googlePlaceId: bar.googlePlaceId,
    name: bar.name,
    overall: overallRating(bar),
    tags: bar.tags,
    notes: bar.notes,
    address: bar.address,
    mapsUrl: bar.mapsUrl,
    location: bar.location,
    googleRating: bar.googleRating,
    googleRatingCount: bar.googleRatingCount,
    priceLevel: bar.priceLevel,
  };
}

/** City scope keeps every bar; near scope keeps those within the radius of the centre. */
export function selectOwnBars(bars: Bar[], scope: LocationScope): OwnBarContext[] {
  const picked = scope.kind === "near" ? bars.filter((b) => haversineM(scope.center, b.location) <= scope.radiusM) : bars;
  return picked.map(toOwnBarContext);
}
