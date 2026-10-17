import { describe, expect, it } from "vitest";
import { barInputSchema, ratingSchema } from "@/lib/bars/schemas";

describe("barInputSchema", () => {
  it("accepts valid input", () => {
    const r = barInputSchema.safeParse({
      ratingLocal: 4.5,
      ratingService: null,
      ratingFood: 1,
      ratingOverallManual: 5,
      priceLevel: 2,
      notes: "Muy bueno",
      tags: [{ name: "vermut", rating: 3.5 }, { name: "tapas", rating: null }],
    });
    expect(r.success).toBe(true);
  });

  it("accepts an empty object", () => {
    expect(barInputSchema.safeParse({}).success).toBe(true);
  });

  it.each([5.5, 0.5, 3.3, 0, 6])("rejects rating %s", (v) => {
    expect(ratingSchema.safeParse(v).success).toBe(false);
    expect(barInputSchema.safeParse({ ratingFood: v }).success).toBe(false);
  });

  it("rejects price outside 1-4", () => {
    expect(barInputSchema.safeParse({ priceLevel: 5 }).success).toBe(false);
    expect(barInputSchema.safeParse({ priceLevel: 0 }).success).toBe(false);
    expect(barInputSchema.safeParse({ priceLevel: 2.5 }).success).toBe(false);
  });

  it("rejects empty or too long tag names", () => {
    expect(barInputSchema.safeParse({ tags: [{ name: "", rating: null }] }).success).toBe(false);
    expect(barInputSchema.safeParse({ tags: [{ name: "x".repeat(61), rating: null }] }).success).toBe(false);
  });

  it("rejects notes over 5000 chars", () => {
    expect(barInputSchema.safeParse({ notes: "x".repeat(5001) }).success).toBe(false);
  });
});
