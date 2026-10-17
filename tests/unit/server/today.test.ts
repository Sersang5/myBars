import { describe, expect, it } from "vitest";
import { madridToday } from "@/lib/server/today";

describe("madridToday", () => {
  it("rolls to the next day after midnight in Madrid", () => {
    expect(madridToday(new Date("2026-10-17T22:30:00Z"))).toBe("2026-10-18");
  });
  it("keeps the same day at midday", () => {
    expect(madridToday(new Date("2026-10-17T10:00:00Z"))).toBe("2026-10-17");
  });
});
