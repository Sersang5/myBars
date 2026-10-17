import { describe, expect, it } from "vitest";
import { starFromPointer } from "@/lib/ui/stars";

describe("starFromPointer", () => {
  it("left half of a star is a half value", () => {
    expect(starFromPointer(10, 40, 0)).toBe(0.5);
    expect(starFromPointer(5, 40, 4)).toBe(4.5);
  });
  it("right half of a star is a full value", () => {
    expect(starFromPointer(30, 40, 0)).toBe(1);
    expect(starFromPointer(30, 40, 2)).toBe(3);
  });
});
