import type { Bar } from "./types";

export function overallRating(bar: Bar): number | null {
  if (bar.ratingOverallManual !== null) return bar.ratingOverallManual;
  const values = [bar.ratingLocal, bar.ratingService, bar.ratingFood].filter(
    (v): v is number => v !== null,
  );
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 10) / 10;
}
