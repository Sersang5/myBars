import { describe, expect, it } from "vitest";
import { overallRating } from "@/lib/bars/rating";
import { makeBar } from "./fixtures";

describe("overallRating", () => {
  it("prefers the manual rating", () => {
    expect(
      overallRating(makeBar({ ratingOverallManual: 4.5, ratingLocal: 2, ratingService: 2, ratingFood: 2 })),
    ).toBe(4.5);
  });
  it("averages non-null criteria", () => {
    expect(overallRating(makeBar({ ratingLocal: 4, ratingService: 5, ratingFood: null }))).toBe(4.5);
    expect(overallRating(makeBar({ ratingLocal: 4, ratingService: 4.5, ratingFood: 5 }))).toBe(4.5);
  });
  it("rounds to one decimal", () => {
    expect(overallRating(makeBar({ ratingLocal: 3, ratingService: 4, ratingFood: 4 }))).toBe(3.7);
  });
  it("is null when nothing is rated", () => {
    expect(overallRating(makeBar())).toBeNull();
  });
});
