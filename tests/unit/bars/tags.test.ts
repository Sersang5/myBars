import { describe, expect, it } from "vitest";
import { normalizeTagName } from "@/lib/bars/tags";

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
