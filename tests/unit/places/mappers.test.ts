import { describe, expect, it } from "vitest";
import { mapPriceLevel } from "@/lib/places/mappers";

describe("mapPriceLevel", () => {
  it.each([
    ["PRICE_LEVEL_FREE", 1],
    ["PRICE_LEVEL_INEXPENSIVE", 1],
    ["PRICE_LEVEL_MODERATE", 2],
    ["PRICE_LEVEL_EXPENSIVE", 3],
    ["PRICE_LEVEL_VERY_EXPENSIVE", 4],
    ["PRICE_LEVEL_UNSPECIFIED", null],
    [undefined, null],
  ])("%s -> %s", (input, expected) => {
    expect(mapPriceLevel(input)).toBe(expected);
  });
});
