import { describe, expect, it } from "vitest";
import { normalizeTagName, suggestTags, withDraftTag } from "@/lib/bars/tags";

describe("normalizeTagName", () => {
  it("trims and lowercases", () => {
    expect(normalizeTagName("  Tortilla  ")).toBe("tortilla");
    expect(normalizeTagName("TORTILLA")).toBe("tortilla");
  });
  it("collapses inner whitespace and keeps accents", () => {
    expect(normalizeTagName("Café   de especialidad")).toBe("café de especialidad");
  });
  it("normalizes composed and decomposed accents to the same string", () => {
    expect(normalizeTagName("café")).toBe(normalizeTagName("café"));
  });
  it("throws on empty", () => {
    expect(() => normalizeTagName("")).toThrow(Error);
    expect(() => normalizeTagName("   ")).toThrow(Error);
  });
});

const summary = (id: string, name: string, barCount: number) => ({ id, name, barCount });

describe("suggestTags", () => {
  const tags = [
    summary("1", "café de especialidad", 1),
    summary("2", "croquetas", 5),
    summary("3", "terraza", 5),
    summary("4", "tortilla", 9),
    summary("5", "vermut", 0),
  ];

  it("without a query lists the most used first, ties by name", () => {
    expect(suggestTags(tags, "", []).map((t) => t.name)).toEqual([
      "tortilla",
      "croquetas",
      "terraza",
      "café de especialidad",
      "vermut",
    ]);
  });
  it("skips tags already on the bar, comparing normalized names", () => {
    expect(suggestTags(tags, "", [" Tortilla", "TERRAZA"]).map((t) => t.id)).toEqual(["2", "1", "5"]);
  });
  it("matches ignoring case and accents, prefix matches first", () => {
    expect(suggestTags(tags, "CAFE", []).map((t) => t.id)).toEqual(["1"]);
    expect(suggestTags(tags, "t", []).map((t) => t.name)).toEqual(["tortilla", "terraza", "croquetas", "vermut"]);
  });
  it("respects the limit", () => {
    expect(suggestTags(tags, "", [], 2)).toHaveLength(2);
  });
});

describe("withDraftTag", () => {
  const tortilla = { name: "tortilla", rating: 4 };
  it("adds a pending typed tag without rating", () => {
    expect(withDraftTag([tortilla], "  Croquetas ")).toEqual([tortilla, { name: "croquetas", rating: null }]);
  });
  it("ignores an empty draft", () => {
    expect(withDraftTag([tortilla], "   ")).toEqual([tortilla]);
  });
  it("does not duplicate a tag that is already there", () => {
    expect(withDraftTag([tortilla], "TORTILLA")).toEqual([tortilla]);
  });
});
