import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { rank } from "@/lib/explorer/rank";
import type { Candidate, Intent, OwnBarContext } from "@/lib/explorer/types";
import { LlmError, type Llm } from "@/lib/llm/client";
import fixture from "../../fixtures/llm/rank-croquetas.json";

const intent: Intent = {
  searchQueries: ["croquetas"],
  placeType: "bar",
  wantsNewOnly: false,
  reviewSignals: ["croquetas cremosas"],
};

function candidate(id: string, name: string, reviewTexts: string[]): Candidate {
  return {
    googlePlaceId: id,
    name,
    address: "Calle 1",
    location: { lat: 0, lng: 0 },
    rating: 4.5,
    userRatingCount: 321,
    priceLevel: 2,
    mapsUrl: "https://maps.example/" + id,
    addressComponents: [],
    reviews: reviewTexts.map((text) => ({ text, rating: 5, relativeTime: "hace 1 mes" })),
    editorialSummary: null,
    openNow: null,
    photoRef: null,
    status: null,
    distanceM: 100,
  };
}

const candidates = [
  candidate("p1", "Bar Uno", ["Las croquetas cremosas son lo mejor del barrio"]),
  candidate("p2", "Bar Dos", ["Buen ambiente"]),
];

const own: OwnBarContext[] = [
  {
    googlePlaceId: "o1",
    name: "Mi Bar",
    overall: 4.5,
    tags: [{ tagId: "t", name: "croquetas", rating: 5 }],
    notes: "Croquetas de cocido",
    address: "a",
    mapsUrl: "m",
    location: { lat: 0, lng: 0 },
    googleRating: 4,
    googleRatingCount: 10,
    priceLevel: null,
  },
];

function fakeLlm(response: unknown) {
  const calls: { system: string; user: string }[] = [];
  const llm: Llm = {
    async json<T>(args: { system: string; user: string; schema: z.ZodType<T> }) {
      calls.push(args);
      return args.schema.parse(response);
    },
  };
  return { llm, calls };
}

describe("rank", () => {
  it("puts id, name, rating, count and review text per candidate in the user message", async () => {
    const { llm, calls } = fakeLlm(fixture);
    await rank(llm, "croquetas", intent, candidates, []);
    const u = calls[0].user;
    for (const s of ["p1", "Bar Uno", "4.5", "321", "Las croquetas cremosas son lo mejor del barrio", "<resenas>"]) {
      expect(u).toContain(s);
    }
    expect(u).not.toContain("Mi Bar");
  });

  it("includes the own-bars section only when own is not empty", async () => {
    const { llm, calls } = fakeLlm(fixture);
    await rank(llm, "croquetas", intent, candidates, own);
    expect(calls[0].user).toContain("Mi Bar");
    expect(calls[0].user).toContain("o1");
  });

  it("drops unknown ids and duplicates, sorts by score, nulls non-matching quotes", async () => {
    const { llm } = fakeLlm(fixture);
    const res = await rank(llm, "croquetas", intent, candidates, []);
    expect(res.map((r) => r.googlePlaceId)).toEqual(["p2", "p1"]);
    expect(res[1].score).toBe(70);
    expect(res[1].quote).toBe("Las croquetas  CREMOSAS son lo mejor");
    expect(res[0].quote).toBeNull();
  });

  it("keeps own-bar ids when own is provided", async () => {
    const { llm } = fakeLlm({ results: [{ googlePlaceId: "o1", score: 80, reason: "r", quote: null }] });
    const res = await rank(llm, "x", intent, candidates, own);
    expect(res.map((r) => r.googlePlaceId)).toEqual(["o1"]);
  });

  it("truncates to 8 results", async () => {
    const many = Array.from({ length: 10 }, (_, i) => candidate(`c${i}`, `B${i}`, ["x"]));
    const results = many.map((c, i) => ({ googlePlaceId: c.googlePlaceId, score: i, reason: "r", quote: null }));
    const { llm } = fakeLlm({ results });
    const res = await rank(llm, "x", intent, many, []);
    expect(res).toHaveLength(8);
    expect(res[0].googlePlaceId).toBe("c9");
  });

  it("propagates LlmError", async () => {
    const llm: Llm = {
      async json() {
        throw new LlmError("refusal", "no");
      },
    };
    await expect(rank(llm, "x", intent, candidates, [])).rejects.toBeInstanceOf(LlmError);
  });
});
