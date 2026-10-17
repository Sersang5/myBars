"use client";

import { overallRating } from "@/lib/bars/rating";
import { cardTags, lastVisit } from "@/lib/bars/query";
import type { Bar } from "@/lib/bars/types";
import { formatLastVisit, formatPrice, formatRating, formatTagLine, shortAddress } from "@/lib/ui/format";

type Props = { bar: Bar; highlightTagIds: string[]; today: string; onOpen: () => void };

export function BarCard({ bar, highlightTagIds, today, onOpen }: Props) {
  const overall = overallRating(bar);
  const price = formatPrice(bar.priceLevel);
  const tagLine = formatTagLine(cardTags(bar, highlightTagIds));
  const last = lastVisit(bar);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="block min-h-11 w-full rounded-xl border border-zinc-200 p-3 text-left dark:border-zinc-800"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold">{bar.name}</span>
          <span className="shrink-0 text-sm font-medium text-amber-600">
            {overall === null ? "Sin valorar" : `★ ${formatRating(overall)}`}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-zinc-500">
          {[price, shortAddress(bar.address)].filter(Boolean).join(" · ")}
        </span>
        {tagLine && <span className="mt-1 block text-sm">{tagLine}</span>}
        <span className="mt-1 block text-xs text-zinc-500">
          {last === null ? "Sin visitas" : `Última visita: ${formatLastVisit(last, today)}`}
        </span>
      </button>
    </li>
  );
}
