import { describe, expect, it } from "vitest";
import { createFakePlacesClient, FAKE_CITY_ID } from "@/lib/places/fake";

const scope = { kind: "city", center: { lat: 0, lng: 0 }, radiusM: 1000 } as const;

describe("createFakePlacesClient", () => {
  const fake = createFakePlacesClient();

  it("serves fixture suggestions, or a city for locality searches", async () => {
    expect((await fake.autocomplete("bar", null)).map((s) => s.mainText)).toEqual(["Bar La Tortilla", "Casa Pepe"]);
    expect(await fake.autocomplete("coru", null, { types: ["locality"] })).toEqual([
      { googlePlaceId: FAKE_CITY_ID, mainText: "A Coruña", secondaryText: "Galicia, España" },
    ]);
  });

  it("returns a locality for city text search and fixtures otherwise", async () => {
    const [city] = await fake.textSearch("A Coruña", scope, { includedType: "locality" });
    expect(city.googlePlaceId).toBe(FAKE_CITY_ID);
    expect((await fake.textSearch("tortilla", scope)).length).toBeGreaterThan(1);
  });

  it("derives a distinct place per suggestion id", async () => {
    const a = await fake.details("ChIJbar1");
    const b = await fake.details("ChIJbar2");
    expect([a.googlePlaceId, a.name]).toEqual(["ChIJbar1", "Bar La Tortilla"]);
    expect([b.googlePlaceId, b.name]).toEqual(["ChIJbar2", "Casa Pepe"]);
    expect(b.addressComponents.some((c) => c.types.includes("locality"))).toBe(true);
    expect((await fake.details(FAKE_CITY_ID)).name).toBe("A Coruña");
  });
});
