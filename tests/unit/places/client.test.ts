import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createPlacesClient } from "@/lib/places/client";
import { PlacesError, type LocationScope } from "@/lib/places/types";
import { detailsReviewSource } from "@/lib/places/reviews";

const fixture = (n: string) => fs.readFileSync(path.join(__dirname, "../../fixtures/places", n), "utf8");

function mockFetch(body: string, status = 200) {
  return vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(body, { status, headers: { "content-type": "application/json" } }),
  );
}
const asFetch = (f: unknown) => f as typeof fetch;
const scope = { kind: "city", center: { lat: 43.37, lng: -8.4 }, radiusM: 5000 } as const;
const headers = (f: ReturnType<typeof mockFetch>) => f.mock.calls[0][1]!.headers as Record<string, string>;

describe("textSearch", () => {
  it("posts to searchText with mask, language and bias, and maps results", async () => {
    const f = mockFetch(fixture("search-tortilla.json"));
    const client = createPlacesClient("KEY", asFetch(f));
    const res = await client.textSearch("tortilla", scope, { includedType: "bar", max: 30 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init!.method).toBe("POST");
    expect(headers(f)["X-Goog-Api-Key"]).toBe("KEY");
    expect(headers(f)["X-Goog-FieldMask"]).toContain("places.id");
    expect(headers(f)["X-Goog-FieldMask"]).toContain("places.userRatingCount");
    const body = JSON.parse(init!.body as string);
    expect(body.textQuery).toBe("tortilla");
    expect(body.languageCode).toBe("es");
    expect(body.includedType).toBe("bar");
    expect(body.pageSize).toBe(20);
    expect(body.locationBias.circle).toEqual({ center: { latitude: 43.37, longitude: -8.4 }, radius: 5000 });
    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({
      googlePlaceId: "ChIJbar1",
      name: "Bar La Tortilla",
      address: "Rúa Real 5, 15003 A Coruña",
      location: { lat: 43.3713, lng: -8.396 },
      rating: 4.6,
      userRatingCount: 812,
      priceLevel: 2,
      mapsUrl: "https://maps.google.com/?cid=111",
    });
    expect(res[1]).toMatchObject({ rating: null, userRatingCount: 0, priceLevel: null });
  });

  it("clamps bias radius to 50000 and pageSize to 1..20", async () => {
    const send = async (s: LocationScope, max?: number) => {
      const f = mockFetch("{}");
      await createPlacesClient("K", asFetch(f)).textSearch("x", s, { max });
      return JSON.parse(f.mock.calls[0][1]!.body as string);
    };
    expect((await send({ ...scope, radiusM: 80000 })).locationBias.circle.radius).toBe(50000);
    expect((await send(scope, 5)).pageSize).toBe(5);
    expect((await send(scope, 0)).pageSize).toBe(1);
  });

  it("returns [] when no places", async () => {
    const client = createPlacesClient("K", asFetch(mockFetch("{}")));
    expect(await client.textSearch("x", scope)).toEqual([]);
  });
});

describe("details", () => {
  it("GETs the place with field mask and maps reviews", async () => {
    const f = mockFetch(fixture("details-bar.json"));
    const client = createPlacesClient("KEY", asFetch(f));
    const d = await client.details("ChIJbar1");
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("https://places.googleapis.com/v1/places/ChIJbar1");
    expect(String(url)).toContain("languageCode=es");
    expect(init!.method).toBe("GET");
    const mask = headers(f)["X-Goog-FieldMask"];
    for (const field of ["reviews", "editorialSummary", "addressComponents", "currentOpeningHours.openNow", "photos"])
      expect(mask).toContain(field);
    expect(d.reviews).toEqual([
      { text: "La mejor tortilla.", rating: 5, relativeTime: "hace un mes", author: "Ana" },
      { text: "Muy bien.", rating: 4, relativeTime: "hace 2 meses" },
    ]);
    expect(d.editorialSummary).toBe("Clásico de tortilla jugosa.");
    expect(d.openNow).toBe(true);
    expect(d.photoRef).toBe("places/ChIJbar1/photos/PHOTO1");
    expect(d.addressComponents).toHaveLength(3);
    expect(detailsReviewSource.getReviews(d)).toBe(d.reviews);
  });

  it("handles missing reviews and optional fields", async () => {
    const client = createPlacesClient("K", asFetch(mockFetch(fixture("details-no-locality.json"))));
    const d = await client.details("ChIJrural");
    expect(d.reviews).toEqual([]);
    expect(d.editorialSummary).toBeNull();
    expect(d.openNow).toBeNull();
    expect(d.photoRef).toBeNull();
  });
});

describe("autocomplete", () => {
  it("posts input, bias and types; maps placePredictions only", async () => {
    const f = mockFetch(fixture("autocomplete.json"));
    const client = createPlacesClient("KEY", asFetch(f));
    const res = await client.autocomplete("tortilla", { lat: 1, lng: 2 }, { types: ["bar"] });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:autocomplete");
    const body = JSON.parse(init!.body as string);
    expect(body.input).toBe("tortilla");
    expect(body.languageCode).toBe("es");
    expect(body.includedPrimaryTypes).toEqual(["bar"]);
    expect(body.locationBias.circle.center).toEqual({ latitude: 1, longitude: 2 });
    expect(headers(f)["X-Goog-FieldMask"]).toContain("suggestions.placePrediction");
    expect(res).toEqual([
      { googlePlaceId: "ChIJbar1", mainText: "Bar La Tortilla", secondaryText: "Rúa Real 5, A Coruña, España" },
      { googlePlaceId: "ChIJbar2", mainText: "Casa Pepe", secondaryText: "Calle Mayor 1, Madrid" },
    ]);
  });

  it("omits bias and types when absent", async () => {
    const f = mockFetch("{}");
    const client = createPlacesClient("K", asFetch(f));
    expect(await client.autocomplete("x", null)).toEqual([]);
    const body = JSON.parse(f.mock.calls[0][1]!.body as string);
    expect(body.locationBias).toBeUndefined();
    expect(body.includedPrimaryTypes).toBeUndefined();
  });
});

describe("errors", () => {
  it.each([
    [403, "auth"],
    [401, "auth"],
    [429, "quota"],
    [404, "not_found"],
    [500, "unknown"],
  ])("HTTP %s -> %s", async (status, kind) => {
    const client = createPlacesClient("K", asFetch(mockFetch("{}", status)));
    const err = await client.details("x").catch((e) => e);
    expect(err).toBeInstanceOf(PlacesError);
    expect(err.kind).toBe(kind);
  });

  it("HTTP 400 with API_KEY_INVALID -> auth", async () => {
    const body = JSON.stringify({
      error: { code: 400, status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] },
    });
    const client = createPlacesClient("K", asFetch(mockFetch(body, 400)));
    const err = await client.details("x").catch((e) => e);
    expect(err.kind).toBe("auth");
  });

  it("HTTP 403 PERMISSION_DENIED -> auth", async () => {
    const body = JSON.stringify({ error: { code: 403, status: "PERMISSION_DENIED" } });
    const client = createPlacesClient("K", asFetch(mockFetch(body, 403)));
    const err = await client.details("x").catch((e) => e);
    expect(err.kind).toBe("auth");
  });

  it("RESOURCE_EXHAUSTED body -> quota; non-JSON 400 stays unknown", async () => {
    const quota = JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } });
    const c1 = createPlacesClient("K", asFetch(mockFetch(quota, 400)));
    expect((await c1.details("x").catch((e) => e)).kind).toBe("quota");
    const c2 = createPlacesClient("K", asFetch(mockFetch("not json", 400)));
    expect((await c2.details("x").catch((e) => e)).kind).toBe("unknown");
  });

  it("fetch throwing -> network", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("boom");
    });
    const client = createPlacesClient("K", asFetch(f));
    const err = await client.textSearch("x", scope).catch((e) => e);
    expect(err).toBeInstanceOf(PlacesError);
    expect(err.kind).toBe("network");
  });
});

describe("timeouts", () => {
  it("gives every request an abort signal", async () => {
    const f = mockFetch("{}");
    const client = createPlacesClient("K", asFetch(f));
    await client.textSearch("x", scope);
    await client.autocomplete("x", null);
    await client.details("id").catch(() => undefined);
    for (const call of f.mock.calls) expect(call[1]!.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps an aborted or timed-out fetch to network", async () => {
    for (const name of ["AbortError", "TimeoutError"]) {
      const f = vi.fn(async () => {
        throw new DOMException("stopped", name);
      });
      await expect(createPlacesClient("K", asFetch(f)).details("id")).rejects.toMatchObject({
        name: "PlacesError",
        kind: "network",
      });
    }
  });

  it("maps a timeout while reading the body to network", async () => {
    const f = vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new DOMException("stopped", "TimeoutError");
          },
        }) as unknown as Response,
    );
    await expect(createPlacesClient("K", asFetch(f)).details("id")).rejects.toMatchObject({ kind: "network" });
  });
});
