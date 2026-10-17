import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractCityName } from "@/lib/places/city";
import type { AddressComponent } from "@/lib/places/types";

const c = (longText: string, type: string): AddressComponent => ({
  longText,
  shortText: longText,
  types: [type, "political"],
});
const fixture = (n: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../../fixtures/places", n), "utf8"));

describe("extractCityName", () => {
  it("prefers locality", () => {
    expect(
      extractCityName([c("Prov", "administrative_area_level_2"), c("Town", "postal_town"), c("Ciudad", "locality")]),
    ).toBe("Ciudad");
  });
  it("falls back to postal_town", () => {
    expect(extractCityName([c("Prov", "administrative_area_level_2"), c("Town", "postal_town")])).toBe("Town");
  });
  it("falls back to administrative_area_level_2", () => {
    expect(extractCityName([c("Prov", "administrative_area_level_2")])).toBe("Prov");
  });
  it("returns null when empty", () => {
    expect(extractCityName([])).toBeNull();
  });
  it("works on fixtures", () => {
    expect(extractCityName(fixture("details-bar.json").addressComponents)).toBe("A Coruña");
    expect(extractCityName(fixture("details-no-locality.json").addressComponents)).toBe("A Coruña");
  });
});
