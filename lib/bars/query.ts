import { overallRating } from "./rating";
import type { Bar, BarFilters, BarSort, BarTag } from "./types";

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function lastVisit(bar: Bar): string | null {
  let max: string | null = null;
  for (const v of bar.visits) {
    if (max === null || v.date > max) max = v.date;
  }
  return max;
}

export function filterBars(bars: Bar[], f: BarFilters, today: Date): Bar[] {
  const text = f.text ? fold(f.text.trim()) : "";
  let cutoff: string | null = null;
  if (f.visitedWithinMonths !== undefined) {
    const total = today.getFullYear() * 12 + today.getMonth() - f.visitedWithinMonths;
    const year = Math.floor(total / 12);
    const month = total - year * 12;
    const lastDay = new Date(year, month + 1, 0).getDate();
    cutoff = isoDate(new Date(year, month, Math.min(today.getDate(), lastDay)));
  }

  return bars.filter((bar) => {
    if (text) {
      const hay = [bar.name, ...bar.tags.map((t) => t.name), bar.notes].map(fold);
      if (!hay.some((h) => h.includes(text))) return false;
    }
    if (f.tagIds && f.tagIds.length > 0) {
      const ids = new Set(bar.tags.map((t) => t.tagId));
      if (!f.tagIds.every((id) => ids.has(id))) return false;
    }
    if (f.minOverall !== undefined) {
      const o = overallRating(bar);
      if (o === null || o < f.minOverall) return false;
    }
    if (f.minLocal !== undefined && (bar.ratingLocal === null || bar.ratingLocal < f.minLocal)) return false;
    if (f.minService !== undefined && (bar.ratingService === null || bar.ratingService < f.minService)) return false;
    if (f.minFood !== undefined && (bar.ratingFood === null || bar.ratingFood < f.minFood)) return false;
    if (f.priceLevels && f.priceLevels.length > 0) {
      if (bar.priceLevel === null || !f.priceLevels.includes(bar.priceLevel)) return false;
    }
    if (cutoff !== null) {
      const last = lastVisit(bar);
      if (last === null || last < cutoff) return false;
    }
    return true;
  });
}

const byName = (a: Bar, b: Bar) => a.name.localeCompare(b.name, "es");

/** Descending by key; null keys go last; ties by name. */
function descNullsLast(key: (b: Bar) => number | string | null) {
  return (a: Bar, b: Bar) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null && kb === null) return byName(a, b);
    if (ka === null) return 1;
    if (kb === null) return -1;
    if (ka === kb) return byName(a, b);
    return ka < kb ? 1 : -1;
  };
}

export function sortBars(bars: Bar[], sort: BarSort, tagId?: string): Bar[] {
  const copy = [...bars];
  switch (sort) {
    case "overall":
      return copy.sort(descNullsLast(overallRating));
    case "tag":
      return copy.sort(
        descNullsLast((b) => b.tags.find((t) => t.tagId === tagId)?.rating ?? null),
      );
    case "recent":
      return copy.sort(descNullsLast(lastVisit));
    case "visits":
      return copy.sort((a, b) => b.visits.length - a.visits.length || byName(a, b));
    case "name":
      return copy.sort(byName);
  }
}

export function defaultSort(f: BarFilters): BarSort {
  return f.tagIds && f.tagIds.length > 0 ? "tag" : "overall";
}

export function cardTags(bar: Bar, highlightTagIds: string[], n = 3): BarTag[] {
  const hl = new Set(highlightTagIds);
  const rank = (t: BarTag) => (hl.has(t.tagId) ? 0 : 1);
  return [...bar.tags]
    .sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.rating === null && b.rating === null) return 0;
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return b.rating - a.rating;
    })
    .slice(0, n);
}
