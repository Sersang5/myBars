"use client";

import type { Bar } from "@/lib/bars/types";
import { formatGoogle, formatPrice, shortAddress } from "@/lib/ui/format";

type Props = { bar: Bar; onVisited: () => void; onRemove: () => void };

export function PendingCard({ bar, onVisited, onRemove }: Props) {
  const price = formatPrice(bar.priceLevel);
  const btn = "min-h-11 rounded-lg border border-zinc-300 px-3 font-medium dark:border-zinc-700";
  return (
    <li className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div>
        <p className="text-base font-semibold">{bar.name}</p>
        <p className="text-sm text-zinc-500">{[price, shortAddress(bar.address)].filter(Boolean).join(" · ")}</p>
        <p className="text-sm text-amber-600">
          {bar.googleRating === null ? "Sin valoración en Google" : formatGoogle(bar.googleRating, bar.googleRatingCount)}
        </p>
        {bar.pendingReason && <p className="mt-1 text-sm italic">{bar.pendingReason}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onVisited} className="min-h-11 rounded-lg bg-amber-600 px-3 font-medium text-white">
          Ya he ido → valorar
        </button>
        <a href={bar.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${btn} flex items-center`}>
          Abrir en Maps
        </a>
        <button type="button" onClick={onRemove} className={`${btn} text-red-600`}>
          Quitar
        </button>
      </div>
    </li>
  );
}
