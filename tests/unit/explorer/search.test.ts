import { describe, expect, it } from "vitest";
import { search } from "@/lib/explorer/search";
import { PlacesError, type LocationScope, type PlaceSummary, type PlacesClient } from "@/lib/places/types";
import { summary } from "./helpers";

const scope: LocationScope = { kind: "city", center: { lat: 43.37, lng: -8.4 }, radiusM: 5000 };

function client(byQuery: Record<string, PlaceSummary[] | Error>) {
  const calls: string[] = [];
  const places = {
    async textSearch(q: string) {
      calls.push(q);
      const r = byQuery[q];
      if (r instanceof Error) throw r;
      return r;
    },
  } as unknown as PlacesClient;
  return { places, calls };
}

describe("search", () => {
  it("queries once per query, dedupes keeping first order, and caps to max", async () => {
    const { places, calls } = client({
      a: [summary("1"), summary("2")],
      b: [summary("2"), summary("3"), summary("4")],
    });
    const out = await search(places, ["a", "b"], scope, 3);
    expect(calls).toEqual(["a", "b"]);
    expect(out.map((p) => p.googlePlaceId)).toEqual(["1", "2", "3"]);
  });

  it("ignores a failing query when another returns results", async () => {
    const { places } = client({ a: new PlacesError("network", "x"), b: [summary("1")] });
    expect((await search(places, ["a", "b"], scope)).map((p) => p.googlePlaceId)).toEqual(["1"]);
  });

  it("rethrows the first error when all queries fail", async () => {
    const first = new PlacesError("quota", "first");
    const { places } = client({ a: first, b: new PlacesError("auth", "second") });
    await expect(search(places, ["a", "b"], scope)).rejects.toBe(first);
  });
});
