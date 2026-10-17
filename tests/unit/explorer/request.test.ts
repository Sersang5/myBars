import { describe, expect, it } from "vitest";
import { exploreRequestSchema } from "@/lib/explorer/request";

const CITY = "3f2b8c1e-5a4d-4e7f-9b1a-2c3d4e5f6a7b";
const ok = { prompt: "tortilla", scope: { kind: "city", cityId: CITY }, novelty: "auto" };

describe("exploreRequestSchema", () => {
  it("accepts a city request and trims the prompt", () => {
    const r = exploreRequestSchema.parse({ ...ok, prompt: "  tortilla  " });
    expect(r.prompt).toBe("tortilla");
  });
  it("accepts a near request", () => {
    const r = exploreRequestSchema.safeParse({
      ...ok,
      scope: { kind: "near", lat: 43.37, lng: -8.4, radiusM: 2000 },
      novelty: "new",
    });
    expect(r.success).toBe(true);
  });
  it.each([
    ["empty prompt", { ...ok, prompt: "   " }],
    ["long prompt", { ...ok, prompt: "a".repeat(301) }],
    ["bad cityId", { ...ok, scope: { kind: "city", cityId: "nope" } }],
    ["bad radius", { ...ok, scope: { kind: "near", lat: 0, lng: 0, radiusM: 3000 } }],
    ["lat out of range", { ...ok, scope: { kind: "near", lat: 91, lng: 0, radiusM: 1000 } }],
    ["lng out of range", { ...ok, scope: { kind: "near", lat: 0, lng: -181, radiusM: 1000 } }],
    ["bad novelty", { ...ok, novelty: "maybe" }],
    ["missing scope", { prompt: "x", novelty: "auto" }],
  ])("rejects %s", (_n, body) => {
    expect(exploreRequestSchema.safeParse(body).success).toBe(false);
  });
  it("accepts a 300-char prompt", () => {
    expect(exploreRequestSchema.safeParse({ ...ok, prompt: "a".repeat(300) }).success).toBe(true);
  });
});
