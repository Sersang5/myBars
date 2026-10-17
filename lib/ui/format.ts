import type { BarTag } from "@/lib/bars/types";

export function formatPrice(level: 1 | 2 | 3 | 4 | null): string {
  return level === null ? "" : "€".repeat(level);
}

export function shortAddress(address: string): string {
  return address.split(",")[0].trim();
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** Relative description of the last visit ("hoy", "ayer", "hace 3 semanas"). */
export function formatLastVisit(date: string | null, today: string): string {
  if (date === null) return "Sin visitas";
  const days = Math.max(0, dayNumber(today) - dayNumber(date));
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

export function formatRating(v: number): string {
  return String(v).replace(".", ",");
}

export function formatTagLine(tags: BarTag[]): string {
  return tags.map((t) => (t.rating === null ? t.name : `${t.name} ${formatRating(t.rating)}`)).join(" · ");
}

export function formatGoogle(rating: number | null, count: number): string {
  if (rating === null) return "Google: sin valoraciones";
  const n = String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Google: ★${formatRating(rating)} (${n} ${count === 1 ? "reseña" : "reseñas"})`;
}

/** "850 m" under 1 km, "2,3 km" from 1 km. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}
