import { describe, expect, it } from "vitest";
import { formatDistance, formatGoogle, formatLastVisit, formatPrice, formatRating, formatTagLine, shortAddress } from "@/lib/ui/format";

describe("formatPrice", () => {
  it("renders euro signs", () => {
    expect(formatPrice(1)).toBe("€");
    expect(formatPrice(4)).toBe("€€€€");
  });
  it("is empty without price", () => {
    expect(formatPrice(null)).toBe("");
  });
});

describe("shortAddress", () => {
  it("keeps the first comma segment", () => {
    expect(shortAddress("Rúa Real, 12, 15003 A Coruña, España")).toBe("Rúa Real");
    expect(shortAddress("  Praza María Pita  ")).toBe("Praza María Pita");
    expect(shortAddress("")).toBe("");
  });
});

describe("formatLastVisit", () => {
  const today = "2026-10-17";
  it("handles null", () => expect(formatLastVisit(null, today)).toBe("Sin visitas"));
  it("today and yesterday", () => {
    expect(formatLastVisit("2026-10-17", today)).toBe("hoy");
    expect(formatLastVisit("2026-10-16", today)).toBe("ayer");
  });
  it("days", () => expect(formatLastVisit("2026-10-14", today)).toBe("hace 3 días"));
  it("weeks", () => expect(formatLastVisit("2026-09-26", today)).toBe("hace 3 semanas"));
  it("months", () => expect(formatLastVisit("2026-08-10", today)).toBe("hace 2 meses"));
  it("years", () => expect(formatLastVisit("2024-10-01", today)).toBe("hace 2 años"));
  it("future dates count as today", () => expect(formatLastVisit("2026-10-20", today)).toBe("hoy"));
});

describe("formatRating", () => {
  it("uses comma decimals", () => {
    expect(formatRating(4.5)).toBe("4,5");
    expect(formatRating(5)).toBe("5");
  });
});

describe("formatTagLine", () => {
  it("joins tags with ratings", () => {
    expect(
      formatTagLine([
        { tagId: "1", name: "tortilla", rating: 5 },
        { tagId: "2", name: "croquetas", rating: 4.5 },
        { tagId: "3", name: "vermut", rating: null },
      ]),
    ).toBe("tortilla 5 · croquetas 4,5 · vermut");
  });
  it("is empty for no tags", () => expect(formatTagLine([])).toBe(""));
});

describe("formatGoogle", () => {
  it("formats rating and thousands", () => {
    expect(formatGoogle(4.4, 1234)).toBe("Google: ★4,4 (1.234 reseñas)");
    expect(formatGoogle(4, 1)).toBe("Google: ★4 (1 reseña)");
  });
  it("handles missing rating", () => expect(formatGoogle(null, 0)).toBe("Google: sin valoraciones"));
});

describe("formatDistance", () => {
  it("uses metres under 1 km", () => {
    expect(formatDistance(850)).toBe("850 m");
    expect(formatDistance(849.6)).toBe("850 m");
  });
  it("uses km with a decimal comma from 1 km", () => {
    expect(formatDistance(2300)).toBe("2,3 km");
    expect(formatDistance(1000)).toBe("1,0 km");
  });
});
