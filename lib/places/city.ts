import type { AddressComponent } from "./types";

const CITY_TYPES = ["locality", "postal_town", "administrative_area_level_2"];

export function extractCityName(components: AddressComponent[]): string | null {
  for (const type of CITY_TYPES) {
    const found = components.find((c) => c.types.includes(type));
    if (found) return found.longText;
  }
  return null;
}
