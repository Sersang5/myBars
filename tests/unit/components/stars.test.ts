import { describe, expect, it } from "vitest";
import { nextStarValue, starFromPointer } from "@/lib/ui/stars";

describe("starFromPointer", () => {
  it("left half of a star is a half value", () => {
    expect(starFromPointer(10, 40, 0)).toBe(0.5);
    expect(starFromPointer(5, 40, 4)).toBe(4.5);
  });
  it("right half of a star is a full value", () => {
    expect(starFromPointer(30, 40, 0)).toBe(1);
    expect(starFromPointer(30, 40, 2)).toBe(3);
  });
  it("exactly the middle of a star counts as the full value", () => {
    expect(starFromPointer(20, 40, 1)).toBe(2);
    expect(starFromPointer(19.99, 40, 1)).toBe(1.5);
  });
});

describe("nextStarValue", () => {
  it("clears when tapping the current value", () => {
    expect(nextStarValue(3.5, 3.5)).toBeNull();
  });
  it("selects otherwise", () => {
    expect(nextStarValue(3.5, 4)).toBe(4);
    expect(nextStarValue(null, 0.5)).toBe(0.5);
  });
});
