import { describe, expect, it } from "vitest";
import { haversineM } from "@/lib/explorer/geo";

describe("haversineM", () => {
  it("A Coruña to Santiago is about 54.7 km", () => {
    const d = haversineM({ lat: 43.3623, lng: -8.4115 }, { lat: 42.8782, lng: -8.5448 });
    expect(d).toBeGreaterThan(54_700 * 0.99);
    expect(d).toBeLessThan(54_700 * 1.01);
  });
  it("is zero for identical points", () => {
    expect(haversineM({ lat: 1, lng: 2 }, { lat: 1, lng: 2 })).toBe(0);
  });
});
