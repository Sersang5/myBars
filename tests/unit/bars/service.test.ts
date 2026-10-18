import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryBarsRepo } from "@/lib/bars/repo.memory";
import { createBarsService } from "@/lib/bars/service";
import { mapPlaceDetails } from "@/lib/places/mappers";
import type { PlaceDetails, PlaceSummary, PlacesClient } from "@/lib/places/types";

function fixture(name: string): PlaceDetails {
  const raw = JSON.parse(readFileSync(path.resolve("tests/fixtures/places", name), "utf8"));
  return mapPlaceDetails(raw);
}

const bar = fixture("details-bar.json");
const rural = fixture("details-no-locality.json");

const corunaSummary: PlaceSummary = {
  googlePlaceId: "ChIJcoruna",
  name: "A Coruña",
  address: "A Coruña, España",
  location: { lat: 43.3623, lng: -8.4115 },
  rating: null,
  userRatingCount: 0,
  priceLevel: null,
  mapsUrl: "",
};

function setup(opts: { search?: PlaceSummary[]; known?: PlaceDetails[] } = {}) {
  const repo = createMemoryBarsRepo();
  const known = new Map((opts.known ?? [bar, rural]).map((d) => [d.googlePlaceId, d]));
  const places = {
    autocomplete: vi.fn(),
    textSearch: vi.fn(async () => opts.search ?? [corunaSummary]),
    details: vi.fn(async (id: string) => {
      const d = known.get(id);
      if (!d) throw new Error(`unknown place ${id}`);
      return d;
    }),
  };
  const service = createBarsService({
    repo,
    places: places as unknown as PlacesClient,
    details: places.details,
    today: () => "2026-10-17",
  });
  return { repo, places, service };
}

describe("bars service", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("addVisitedBar creates city, place, visited bar, normalized tags and one visit", async () => {
    const { service, repo, places } = ctx;
    const res = await service.addVisitedBar(bar.googlePlaceId, {
      ratingFood: 4.5,
      notes: "Muy bueno",
      tags: [
        { name: " Tortilla ", rating: 5 },
        { name: "Vermut", rating: null },
      ],
    });
    expect(res.existed).toBe(false);

    expect(places.textSearch).toHaveBeenCalledTimes(1);
    const [query, scope, opts] = places.textSearch.mock.calls[0] as unknown as [string, { kind: string; radiusM: number; center: unknown }, unknown];
    expect(query).toBe("A Coruña");
    expect(scope).toMatchObject({ kind: "city", radiusM: 50000, center: bar.location });
    expect(opts).toEqual({ includedType: "locality", max: 1 });

    const cities = await repo.listCities();
    expect(cities.map((c) => c.name)).toEqual(["A Coruña"]);
    expect(res).toMatchObject({ cityId: cities[0].id, cityName: "A Coruña" });

    const stored = await repo.getBar(res.barId);
    expect(stored).toMatchObject({
      status: "visited",
      googlePlaceId: bar.googlePlaceId,
      cityId: cities[0].id,
      ratingFood: 4.5,
      notes: "Muy bueno",
    });
    expect(stored!.tags.map((t) => [t.name, t.rating]).sort()).toEqual([
      ["tortilla", 5],
      ["vermut", null],
    ]);
    expect(stored!.visits).toHaveLength(1);
    expect(stored!.visits[0].date).toBe("2026-10-17");
    expect(repo.counts()).toMatchObject({ cities: 1, places: 1, bars: 1, visits: 1 });
  });

  it("second addVisitedBar for the same place is a no-op", async () => {
    const { service, repo } = ctx;
    const first = await service.addVisitedBar(bar.googlePlaceId, {});
    const second = await service.addVisitedBar(bar.googlePlaceId, {});
    expect(second).toEqual({ barId: first.barId, existed: true, cityId: first.cityId, cityName: "A Coruña" });
    expect(repo.counts()).toMatchObject({ places: 1, bars: 1, visits: 1 });
  });

  it("addPendingBar on a visited bar keeps it visited", async () => {
    const { service, repo } = ctx;
    const first = await service.addVisitedBar(bar.googlePlaceId, {});
    const res = await service.addPendingBar(bar.googlePlaceId, "me lo recomendó Ana");
    expect(res).toEqual({ barId: first.barId, existed: true, cityId: first.cityId, cityName: "A Coruña" });
    expect((await repo.getBar(first.barId))!.status).toBe("visited");
  });

  it("addPendingBar creates a pending bar with its reason", async () => {
    const { service, repo } = ctx;
    const res = await service.addPendingBar(bar.googlePlaceId, "probar la tortilla");
    expect(res.existed).toBe(false);
    const [city] = await repo.listCities();
    expect(res).toMatchObject({ cityId: city.id, cityName: "A Coruña" });
    expect(await repo.getBar(res.barId)).toMatchObject({
      status: "pending",
      pendingReason: "probar la tortilla",
    });
    expect(repo.counts().visits).toBe(0);
  });

  it("addVisitedBar on a pending bar promotes it, applies input and records a visit", async () => {
    const { service, repo } = ctx;
    const pending = await service.addPendingBar(bar.googlePlaceId, null);
    const res = await service.addVisitedBar(bar.googlePlaceId, { ratingLocal: 4, priceLevel: 2 });
    expect(res).toEqual({ barId: pending.barId, existed: true, cityId: pending.cityId, cityName: "A Coruña" });
    const stored = await repo.getBar(pending.barId);
    expect(stored).toMatchObject({ status: "visited", ratingLocal: 4, priceLevel: 2 });
    expect(stored!.visits).toHaveLength(1);
    expect(repo.counts().places).toBe(1);
  });

  it("derives the city from administrative_area_level_2 when there is no locality", async () => {
    const { service, repo } = ctx;
    const res = await service.addVisitedBar(rural.googlePlaceId, {});
    const stored = await repo.getBar(res.barId);
    const city = await repo.findCityByName("A Coruña");
    expect(city).not.toBeNull();
    expect(stored!.cityId).toBe(city!.id);
  });

  it("stores cityId null when no city can be extracted", async () => {
    const noCity: PlaceDetails = { ...rural, googlePlaceId: "ChIJnocity", addressComponents: [] };
    const { service, repo, places } = setup({ known: [noCity] });
    const res = await service.addVisitedBar("ChIJnocity", {});
    expect(res).toMatchObject({ existed: false, cityId: null, cityName: null });
    expect((await repo.getBar(res.barId))!.cityId).toBeNull();
    expect(places.textSearch).not.toHaveBeenCalled();
  });

  it("resolveCity twice with the same name yields a single city and one search", async () => {
    const { service, repo, places } = ctx;
    const a = await service.resolveCity("A Coruña");
    const b = await service.resolveCity("a coruña");
    expect(b.id).toBe(a.id);
    expect(await repo.listCities()).toHaveLength(1);
    expect(places.textSearch).toHaveBeenCalledTimes(1);
    expect((places.textSearch.mock.calls[0] as unknown[])[1]).toMatchObject({ center: { lat: 40.4168, lng: -3.7038 } });
  });

  it("resolveCity falls back to a name-based id when the search finds nothing", async () => {
    const { service } = setup({ search: [] });
    const near = { lat: 43.1, lng: -8.2 };
    const city = await service.resolveCity("Pueblo Nuevo", near);
    expect(city).toMatchObject({ name: "Pueblo Nuevo", google_place_id: "name:pueblo nuevo", lat: 43.1, lng: -8.2 });
  });

  it("addCity is idempotent and uses the place details", async () => {
    const cityDetails: PlaceDetails = { ...bar, googlePlaceId: "ChIJvigo", name: "Vigo", location: { lat: 42.24, lng: -8.72 } };
    const { service, repo, places } = setup({ known: [cityDetails] });
    const a = await service.addCity("ChIJvigo");
    const b = await service.addCity("ChIJvigo");
    expect(b.id).toBe(a.id);
    expect(a).toMatchObject({ name: "Vigo", google_place_id: "ChIJvigo", lat: 42.24, lng: -8.72 });
    expect(await repo.listCities()).toHaveLength(1);
    expect(places.details).toHaveBeenCalledTimes(1);
  });

  it("updateBar dedupes tags by normalized name, last rating wins", async () => {
    const { service, repo } = ctx;
    const { barId } = await service.addVisitedBar(bar.googlePlaceId, {});
    await service.updateBar(barId, {
      tags: [
        { name: "Tortilla ", rating: 5 },
        { name: "tortilla", rating: 4 },
      ],
    });
    const stored = await repo.getBar(barId);
    expect(stored!.tags.map((t) => [t.name, t.rating])).toEqual([["tortilla", 4]]);
    expect(await repo.listTags()).toHaveLength(1);
  });

  it("updateBar without tags leaves existing tags untouched", async () => {
    const { service, repo } = ctx;
    const { barId } = await service.addVisitedBar(bar.googlePlaceId, { tags: [{ name: "vermut", rating: 3 }] });
    await service.updateBar(barId, { notes: "nota" });
    const stored = await repo.getBar(barId);
    expect(stored!.notes).toBe("nota");
    expect(stored!.tags).toHaveLength(1);
  });

  it("markVisited changes status, applies input and adds a visit", async () => {
    const { service, repo } = ctx;
    const { barId } = await service.addPendingBar(bar.googlePlaceId, "razón");
    await service.markVisited(barId, { ratingService: 3.5, tags: [{ name: "Croquetas", rating: 4 }] });
    const stored = await repo.getBar(barId);
    expect(stored).toMatchObject({ status: "visited", ratingService: 3.5 });
    expect(stored!.tags.map((t) => t.name)).toEqual(["croquetas"]);
    expect(stored!.visits.map((v) => v.date)).toEqual(["2026-10-17"]);
  });

  it("addVisit appends a visit and deleteBar removes the bar", async () => {
    const { service, repo } = ctx;
    const { barId } = await service.addVisitedBar(bar.googlePlaceId, {});
    await service.addVisit(barId, "otra vez");
    expect((await repo.getBar(barId))!.visits).toHaveLength(2);
    await service.deleteBar(barId);
    expect(await repo.getBar(barId)).toBeNull();
  });

  it("markVisited and addVisitedBar on a pending bar clear pendingReason", async () => {
    const { service, repo } = ctx;
    const a = await service.addPendingBar(bar.googlePlaceId, "razón");
    expect((await repo.getBar(a.barId))!.pendingReason).toBe("razón");
    await service.markVisited(a.barId, {});
    expect((await repo.getBar(a.barId))!.pendingReason).toBeNull();

    const b = await service.addPendingBar(rural.googlePlaceId, "otra razón");
    await service.addVisitedBar(rural.googlePlaceId, {});
    expect((await repo.getBar(b.barId))!.pendingReason).toBeNull();
  });

  describe("tag management", () => {
    async function twoBars() {
      const { service, repo } = ctx;
      const a = await service.addVisitedBar(bar.googlePlaceId, {
        tags: [
          { name: "croqueta", rating: 3 },
          { name: "croquetas", rating: null },
          { name: "terraza", rating: null },
        ],
      });
      const b = await service.addVisitedBar(rural.googlePlaceId, { tags: [{ name: "croqueta", rating: 4.5 }] });
      const id = async (name: string) => (await repo.listTags()).find((t) => t.name === name)!.id;
      return { a: a.barId, b: b.barId, id };
    }
    const tagsOf = async (barId: string) =>
      (await ctx.repo.getBar(barId))!.tags.map((t) => [t.name, t.rating]).sort();

    it("listTags reports how many bars use each tag", async () => {
      await twoBars();
      expect(await ctx.repo.listTags()).toEqual([
        expect.objectContaining({ name: "croqueta", barCount: 2 }),
        expect.objectContaining({ name: "croquetas", barCount: 1 }),
        expect.objectContaining({ name: "terraza", barCount: 1 }),
      ]);
    });

    it("renameTag renames in place, normalizing the new name", async () => {
      const { a, id } = await twoBars();
      const terraza = await id("terraza");
      expect(await ctx.service.renameTag(terraza, "  Terraza Cubierta ")).toEqual({ tagId: terraza, merged: false });
      expect(await tagsOf(a)).toContainEqual(["terraza cubierta", null]);
    });

    it("renameTag onto an existing name merges, keeping the target's rating when it has one", async () => {
      const { a, b, id } = await twoBars();
      const singular = await id("croqueta");
      const plural = await id("croquetas");
      expect(await ctx.service.renameTag(singular, "Croquetas")).toEqual({ tagId: plural, merged: true });
      // Bar a had both: the target had no rating, so it takes the source's.
      expect(await tagsOf(a)).toEqual([["croquetas", 3], ["terraza", null]]);
      expect(await tagsOf(b)).toEqual([["croquetas", 4.5]]);
      expect((await ctx.repo.listTags()).map((t) => [t.name, t.barCount])).toEqual([["croquetas", 2], ["terraza", 1]]);
    });

    it("renameTag keeps the target's own rating on conflict", async () => {
      const { service, repo } = ctx;
      const { barId } = await service.addVisitedBar(bar.googlePlaceId, {
        tags: [{ name: "vermú", rating: 2 }, { name: "vermut", rating: 5 }],
      });
      const vermu = (await repo.listTags()).find((t) => t.name === "vermú")!.id;
      await service.renameTag(vermu, "vermut");
      expect((await repo.getBar(barId))!.tags.map((t) => [t.name, t.rating])).toEqual([["vermut", 5]]);
    });

    it("renameTag to the same name is a no-op and an empty name is rejected", async () => {
      const { id } = await twoBars();
      const terraza = await id("terraza");
      expect(await ctx.service.renameTag(terraza, "TERRAZA")).toEqual({ tagId: terraza, merged: false });
      await expect(ctx.service.renameTag(terraza, "   ")).rejects.toThrow();
    });

    it("deleteTag removes the tag from every bar", async () => {
      const { a, b, id } = await twoBars();
      await ctx.service.deleteTag(await id("croqueta"));
      expect(await tagsOf(a)).toEqual([["croquetas", null], ["terraza", null]]);
      expect(await tagsOf(b)).toEqual([]);
      expect((await ctx.repo.listTags()).map((t) => t.name)).toEqual(["croquetas", "terraza"]);
    });

    it("tags left without bars are cleaned up after editing or deleting a bar", async () => {
      const { a, b } = await twoBars();
      await ctx.service.updateBar(a, { tags: [{ name: "croqueta", rating: 3 }] });
      expect((await ctx.repo.listTags()).map((t) => t.name)).toEqual(["croqueta"]);
      await ctx.service.deleteBar(a);
      await ctx.service.deleteBar(b);
      expect(await ctx.repo.listTags()).toEqual([]);
    });
  });
});
