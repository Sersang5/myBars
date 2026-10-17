import { describe, expect, it } from "vitest";
import { enrich } from "@/lib/explorer/enrich";
import { haversineM } from "@/lib/explorer/geo";
import { PlacesError } from "@/lib/places/types";
import { detailsOf, summary } from "./helpers";

const center = { lat: 43.3623, lng: -8.4115 };
const withStatus = (s: ReturnType<typeof summary>) => ({ ...s, status: null as null });

describe("enrich", () => {
  it("sorts by popularity before cutting to n and computes distance", async () => {
    const list = [summary("low", 3, 10), summary("top", 4.8, 1000), summary("mid", 4.5, 100)].map(withStatus);
    const asked: string[] = [];
    const out = await enrich(
      async (id) => {
        asked.push(id);
        return detailsOf(list.find((s) => s.googlePlaceId === id)!);
      },
      list,
      center,
      2,
    );
    expect([...asked].sort()).toEqual(["mid", "top"]);
    expect(out.map((c) => c.googlePlaceId)).toEqual(["top", "mid"]);
    expect(out[0].distanceM).toBeCloseTo(haversineM(center, list[1].location));
  });

  it("omits a detail that fails", async () => {
    const list = [summary("a"), summary("b")].map(withStatus);
    const out = await enrich(
      async (id) => {
        if (id === "a") throw new Error("boom");
        return detailsOf(list[1]);
      },
      list,
      center,
    );
    expect(out.map((c) => c.googlePlaceId)).toEqual(["b"]);
  });

  it("carries the status through", async () => {
    const s = { ...summary("a"), status: "pending" as const };
    const [c] = await enrich(async () => detailsOf(s), [s], center);
    expect(c.status).toBe("pending");
  });

  it("rethrows the first PlacesError when every detail fails", async () => {
    const list = [summary("a"), summary("b")].map(withStatus);
    const p = enrich(
      async (id) => {
        throw new PlacesError(id === "a" ? "quota" : "auth", id);
      },
      list,
      center,
    );
    await expect(p).rejects.toBeInstanceOf(PlacesError);
    await expect(p).rejects.toMatchObject({ kind: "quota" });
  });

  it("returns empty when every detail fails with a non-Places error, or nothing was asked", async () => {
    const list = [summary("a")].map(withStatus);
    expect(await enrich(async () => Promise.reject(new Error("boom")), list, center)).toEqual([]);
    expect(await enrich(async () => Promise.reject(new PlacesError("quota", "q")), [], center)).toEqual([]);
  });
});
