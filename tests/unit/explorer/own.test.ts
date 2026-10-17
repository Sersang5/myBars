import { describe, expect, it } from "vitest";
import { selectOwnBars, toOwnBarContext } from "@/lib/explorer/own";
import { makeBar } from "../bars/fixtures";

describe("toOwnBarContext", () => {
  it("maps a bar and computes overall", () => {
    const bar = makeBar({
      googlePlaceId: "gX",
      name: "La Tasca",
      ratingLocal: 4,
      ratingFood: 5,
      notes: "buena tortilla",
      tags: [{ tagId: "t", name: "tortilla", rating: 5 }],
      googleRating: 4.4,
      googleRatingCount: 120,
      priceLevel: 2,
    });
    expect(toOwnBarContext(bar)).toEqual({
      googlePlaceId: "gX",
      name: "La Tasca",
      overall: 4.5,
      tags: bar.tags,
      notes: "buena tortilla",
      address: bar.address,
      mapsUrl: bar.mapsUrl,
      location: bar.location,
      googleRating: 4.4,
      googleRatingCount: 120,
      priceLevel: 2,
    });
  });
});

describe("selectOwnBars", () => {
  const center = { lat: 43.37, lng: -8.4 };
  const near = makeBar({ googlePlaceId: "near", location: { lat: 43.371, lng: -8.4 } }); // ~111 m
  const mid = makeBar({ googlePlaceId: "mid", location: { lat: 43.385, lng: -8.4 } }); // ~1.7 km
  const far = makeBar({ googlePlaceId: "far", location: { lat: 43.5, lng: -8.4 } });
  const bars = [near, mid, far];

  it("keeps only bars within the radius for near scope", () => {
    const ids = selectOwnBars(bars, { kind: "near", center, radiusM: 1000 }).map((b) => b.googlePlaceId);
    expect(ids).toEqual(["near"]);
    const ids2 = selectOwnBars(bars, { kind: "near", center, radiusM: 2000 }).map((b) => b.googlePlaceId);
    expect(ids2).toEqual(["near", "mid"]);
  });
  it("keeps all bars for city scope", () => {
    expect(selectOwnBars(bars, { kind: "city", center, radiusM: 10000 })).toHaveLength(3);
  });
});
