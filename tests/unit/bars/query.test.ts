import { describe, expect, it } from "vitest";
import { cardTags, defaultSort, filterBars, lastVisit, sortBars } from "@/lib/bars/query";
import { makeBar } from "./fixtures";

const today = new Date("2026-10-17T12:00:00Z");
const tag = (tagId: string, name: string, rating: number | null = null) => ({ tagId, name, rating });
const visit = (id: string, date: string) => ({ id, date, note: null });

describe("filterBars", () => {
  it("text matches name, tag name and notes, ignoring case and accents", () => {
    const byName = makeBar({ id: "1", name: "La Tortillería" });
    const byTag = makeBar({ id: "2", name: "X", tags: [tag("t", "Tortilla")] });
    const byNotes = makeBar({ id: "3", name: "Y", notes: "Buena TORTILLA" });
    const none = makeBar({ id: "4", name: "Z" });
    const ids = filterBars([byName, byTag, byNotes, none], { text: "tort" }, today).map((b) => b.id);
    expect(ids).toEqual(["1", "2", "3"]);
    const cafe = makeBar({ id: "5", name: "Café Central" });
    expect(filterBars([cafe, none], { text: "cafe" }, today)).toEqual([cafe]);
  });
  it("tagIds requires all (AND)", () => {
    const both = makeBar({ id: "1", tags: [tag("a", "a"), tag("b", "b")] });
    const one = makeBar({ id: "2", tags: [tag("a", "a")] });
    expect(filterBars([both, one], { tagIds: ["a", "b"] }, today)).toEqual([both]);
  });
  it("minOverall excludes null overall", () => {
    const hi = makeBar({ id: "1", ratingOverallManual: 4.5 });
    const lo = makeBar({ id: "2", ratingOverallManual: 3 });
    const nul = makeBar({ id: "3" });
    expect(filterBars([hi, lo, nul], { minOverall: 4 }, today)).toEqual([hi]);
  });
  it("minLocal/minService/minFood fail on null", () => {
    const a = makeBar({ id: "1", ratingLocal: 4, ratingService: 4, ratingFood: 4 });
    const b = makeBar({ id: "2", ratingLocal: null });
    expect(filterBars([a, b], { minLocal: 4 }, today)).toEqual([a]);
    expect(filterBars([a, b], { minService: 5 }, today)).toEqual([]);
    expect(filterBars([a, b], { minFood: 3.5 }, today)).toEqual([a]);
  });
  it("priceLevels", () => {
    const p1 = makeBar({ id: "1", priceLevel: 1 });
    const p3 = makeBar({ id: "2", priceLevel: 3 });
    const pn = makeBar({ id: "3" });
    expect(filterBars([p1, p3, pn], { priceLevels: [1, 2] }, today)).toEqual([p1]);
  });
  it("visitedWithinMonths uses last visit", () => {
    const recent = makeBar({ id: "1", visits: [visit("v", "2025-01-01"), visit("w", "2026-08-01")] });
    const old = makeBar({ id: "2", visits: [visit("v", "2026-05-01")] });
    const never = makeBar({ id: "3" });
    expect(filterBars([recent, old, never], { visitedWithinMonths: 3 }, today)).toEqual([recent]);
  });
  it("visitedWithinMonths clamps the cutoff at month end", () => {
    const eod = new Date("2026-05-31T12:00:00");
    const edge = makeBar({ id: "1", visits: [visit("v", "2026-02-28")] });
    const before = makeBar({ id: "2", visits: [visit("v", "2026-02-27")] });
    expect(filterBars([edge, before], { visitedWithinMonths: 3 }, eod)).toEqual([edge]);
  });
  it("visitedWithinMonths includes the exact boundary date", () => {
    const edge = makeBar({ id: "1", visits: [visit("v", "2026-07-17")] });
    const before = makeBar({ id: "2", visits: [visit("v", "2026-07-16")] });
    expect(filterBars([edge, before], { visitedWithinMonths: 3 }, today)).toEqual([edge]);
  });
  it("empty filters return everything", () => {
    const bars = [makeBar({ id: "1" }), makeBar({ id: "2" })];
    expect(filterBars(bars, {}, today)).toEqual(bars);
  });
});

describe("sortBars", () => {
  it("overall desc, null last, ties by name; does not mutate", () => {
    const a = makeBar({ id: "a", name: "Beta", ratingOverallManual: 4 });
    const b = makeBar({ id: "b", name: "Alfa", ratingOverallManual: 4 });
    const c = makeBar({ id: "c", name: "Cero" });
    const d = makeBar({ id: "d", name: "Delta", ratingOverallManual: 5 });
    const input = [a, c, b, d];
    expect(sortBars(input, "overall").map((x) => x.id)).toEqual(["d", "b", "a", "c"]);
    expect(input.map((x) => x.id)).toEqual(["a", "c", "b", "d"]);
  });
  it("tag by tag rating, bars without it last", () => {
    const a = makeBar({ id: "a", name: "A", tags: [tag("t", "t", 3)] });
    const b = makeBar({ id: "b", name: "B", tags: [tag("t", "t", 5)] });
    const c = makeBar({ id: "c", name: "C", tags: [tag("t", "t", null)] });
    const d = makeBar({ id: "d", name: "D" });
    expect(sortBars([d, c, a, b], "tag", "t").map((x) => x.id)).toEqual(["b", "a", "c", "d"]);
  });
  it("recent by last visit desc, no visits last", () => {
    const a = makeBar({ id: "a", visits: [visit("1", "2026-01-01")] });
    const b = makeBar({ id: "b", visits: [visit("2", "2026-06-01")] });
    const c = makeBar({ id: "c" });
    expect(sortBars([c, a, b], "recent").map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
  it("visits by count desc", () => {
    const v = (n: number) => Array.from({ length: n }, (_, i) => visit(String(i), "2026-01-01"));
    const a = makeBar({ id: "a", name: "A", visits: v(1) });
    const b = makeBar({ id: "b", name: "B", visits: v(3) });
    expect(sortBars([a, b], "visits").map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("name uses Spanish collation", () => {
    const n = makeBar({ id: "n", name: "Ñora" });
    const o = makeBar({ id: "o", name: "Oso" });
    const a = makeBar({ id: "a", name: "Árbol" });
    expect(sortBars([o, n, a], "name").map((x) => x.id)).toEqual(["a", "n", "o"]);
  });
});

describe("defaultSort", () => {
  it("tag when filtering by tags, else overall", () => {
    expect(defaultSort({ tagIds: ["x"] })).toBe("tag");
    expect(defaultSort({})).toBe("overall");
  });
});

describe("cardTags", () => {
  it("highlighted first, then by rating desc, unrated last, max n", () => {
    const bar = makeBar({
      tags: [tag("a", "a", 3), tag("b", "b", null), tag("c", "c", 5), tag("d", "d", 4)],
    });
    expect(cardTags(bar, ["b"]).map((t) => t.tagId)).toEqual(["b", "c", "d"]);
    expect(cardTags(bar, [], 2).map((t) => t.tagId)).toEqual(["c", "d"]);
  });
});

describe("lastVisit", () => {
  it("returns max date or null", () => {
    expect(lastVisit(makeBar())).toBeNull();
    expect(lastVisit(makeBar({ visits: [visit("1", "2026-02-01"), visit("2", "2026-09-01")] }))).toBe("2026-09-01");
  });
});
