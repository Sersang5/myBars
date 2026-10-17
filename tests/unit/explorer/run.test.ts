import { afterEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { runExplore, type ExploreDeps } from "@/lib/explorer/run";
import type { Intent, OwnBarContext } from "@/lib/explorer/types";
import { LlmError, type Llm } from "@/lib/llm/client";
import { PlacesError, type LocationScope, type PlacesClient } from "@/lib/places/types";
import { detailsOf, summary } from "./helpers";

const scope: LocationScope = { kind: "city", center: { lat: 43.3623, lng: -8.4115 }, radiusM: 5000 };

const own: OwnBarContext = {
  googlePlaceId: "own1",
  name: "Mi Bar",
  overall: 4,
  tags: [],
  notes: "",
  address: "Mi calle",
  mapsUrl: "https://maps.example/own1",
  location: { lat: 43.3723, lng: -8.4115 },
  googleRating: 4.2,
  googleRatingCount: 55,
  priceLevel: 1,
};

type RankItem = { googlePlaceId: string; score: number; reason: string; quote: string | null };

function setup(
  opts: {
    wantsNewOnly?: boolean;
    rank?: RankItem[] | Error;
    found?: ReturnType<typeof summary>[];
    visited?: string[];
  } = {},
) {
  const intent: Intent = {
    searchQueries: ["q"],
    wantsNewOnly: opts.wantsNewOnly ?? false,
    reviewSignals: [],
  };
  const calls: { user: string }[] = [];
  const llm: Llm = {
    async json<T>(args: { system: string; user: string; schema: z.ZodType<T> }) {
      calls.push(args);
      if (!args.user.includes("Candidatos:")) return intent as T;
      if (opts.rank instanceof Error) throw opts.rank;
      return { results: opts.rank ?? [] } as T;
    },
  };
  const found = opts.found ?? [summary("a", 4.0, 100), summary("b", 4.8, 1000), summary("c", 3.5, 10)];
  const places = { textSearch: vi.fn(async () => found) } as unknown as PlacesClient;
  const deps: ExploreDeps = {
    llm,
    places,
    details: async (id) => detailsOf(found.find((s) => s.googlePlaceId === id)!),
    visitedIds: new Set(opts.visited ?? []),
    pendingIds: new Set(),
    ownBars: [own],
  };
  const rankCalls = () => calls.filter((c) => c.user.includes("Candidatos:"));
  return { deps, rankCalls };
}

const req = (novelty: "auto" | "new" | "include" = "auto", prompt = "croquetas") => ({ prompt, scope, novelty });
const oneRank: RankItem[] = [{ googlePlaceId: "b", score: 1, reason: "r", quote: null }];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runExplore", () => {
  it("rejects an empty prompt", async () => {
    await expect(runExplore(setup().deps, req("auto", "   "))).rejects.toThrow("empty_prompt");
  });

  it("happy path keeps rank order (score desc) with reason and quote", async () => {
    const { deps } = setup({
      rank: [
        { googlePlaceId: "a", score: 60, reason: "ra", quote: null },
        { googlePlaceId: "b", score: 90, reason: "rb", quote: "muy bueno" },
      ],
    });
    const res = await runExplore(deps, req());
    expect(res.degraded).toBe(false);
    expect(res.message).toBeNull();
    expect(res.results.map((r) => [r.googlePlaceId, r.reason, r.quote])).toEqual([
      ["b", "rb", "muy bueno"],
      ["a", "ra", null],
    ]);
  });

  it("novelty 'new' forces newOnly even if intent says false", async () => {
    const { deps, rankCalls } = setup({ visited: ["a"], rank: oneRank });
    await runExplore(deps, req("new"));
    const user = rankCalls()[0].user;
    expect(user).not.toContain("googlePlaceId: a\n");
    expect(user).not.toContain("Mis bares:");
  });

  it("novelty 'include' keeps visited and passes own bars even if intent wants new only", async () => {
    const { deps, rankCalls } = setup({ wantsNewOnly: true, visited: ["a"], rank: oneRank });
    await runExplore(deps, req("include"));
    const user = rankCalls()[0].user;
    expect(user).toContain("googlePlaceId: a\n");
    expect(user).toContain("Mis bares:");
  });

  it("novelty 'auto' follows intent.wantsNewOnly", async () => {
    const yes = setup({ wantsNewOnly: true, visited: ["a"], rank: oneRank });
    await runExplore(yes.deps, req("auto"));
    expect(yes.rankCalls()[0].user).not.toContain("Mis bares:");
    expect(yes.rankCalls()[0].user).not.toContain("googlePlaceId: a\n");
    const no = setup({ wantsNewOnly: false, visited: ["a"], rank: oneRank });
    await runExplore(no.deps, req("auto"));
    expect(no.rankCalls()[0].user).toContain("Mis bares:");
  });

  it("falls back to popularity order when rank fails, and logs it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = setup({ rank: new LlmError("api", "llm down") });
    const res = await runExplore(deps, req());
    expect(res.degraded).toBe(true);
    expect(res.message).toBe("No se pudo analizar las reseñas; resultados ordenados por valoración de Google.");
    expect(res.results.map((r) => r.googlePlaceId)).toEqual(["b", "a", "c"]);
    expect(res.results.every((r) => r.reason === null && r.quote === null)).toBe(true);
    expect(error).toHaveBeenCalledWith("[explore] rank failed", "api", "llm down");
  });

  it("caps the degraded list at 8", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const found = Array.from({ length: 10 }, (_, i) => summary("p" + i, 4, 10 + i));
    const res = await runExplore(setup({ rank: new Error("x"), found }).deps, req());
    expect(res.results).toHaveLength(8);
    expect(error).toHaveBeenCalledWith("[explore] rank failed", "Error", "x");
  });

  it("returns an empty result without calling rank when nothing is left", async () => {
    const { deps, rankCalls } = setup({ found: [], rank: [] });
    const res = await runExplore(deps, req());
    expect(res.results).toEqual([]);
    expect(res.degraded).toBe(false);
    expect(res.message).toBe("No encontré sitios para eso. Prueba a ampliar el radio o reformular la búsqueda.");
    expect(rankCalls()).toHaveLength(0);
  });

  it("builds a result from an own bar returned by rank", async () => {
    const { deps } = setup({ rank: [{ googlePlaceId: "own1", score: 80, reason: "lo conoces", quote: null }] });
    const res = await runExplore(deps, req("include"));
    expect(res.results).toHaveLength(1);
    expect(res.results[0]).toMatchObject({
      googlePlaceId: "own1",
      name: "Mi Bar",
      address: "Mi calle",
      rating: 4.2,
      userRatingCount: 55,
      priceLevel: 1,
      openNow: null,
      status: "visited",
      reason: "lo conoces",
    });
    expect(res.results[0].distanceM).toBeGreaterThan(1000);
    expect(res.results[0].distanceM).toBeLessThan(1200);
  });

  it("rethrows a PlacesError from search", async () => {
    const { deps } = setup();
    deps.places = {
      textSearch: async () => {
        throw new PlacesError("quota", "q");
      },
    } as unknown as PlacesClient;
    await expect(runExplore(deps, req())).rejects.toMatchObject({ kind: "quota" });
  });

  it("rethrows a PlacesError when every Place Details call fails", async () => {
    const { deps, rankCalls } = setup({ rank: oneRank });
    deps.details = async () => {
      throw new PlacesError("auth", "denied");
    };
    await expect(runExplore(deps, req())).rejects.toMatchObject({ kind: "auth" });
    expect(rankCalls()).toHaveLength(0);
  });

  it("does not hide bugs outside the rank call behind the degraded fallback", async () => {
    const { deps } = setup({ rank: [{ googlePlaceId: "own1", score: 80, reason: "r", quote: null }] });
    deps.ownBars = [{ ...own, location: undefined as never }];
    await expect(runExplore(deps, req("include"))).rejects.toThrow(TypeError);
  });
});
