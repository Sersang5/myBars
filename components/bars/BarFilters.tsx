"use client";

import { useState } from "react";
import type { BarFilters as Filters, TagFilterOption } from "@/lib/bars/types";
import { Stars } from "@/components/Stars";

type Props = {
  filters: Filters;
  /** Tags used by the bars on screen (plus any already selected). */
  tags: TagFilterOption[];
  onApply: (f: Filters) => void;
  onManageTags: () => void;
};

const MONTHS = [1, 3, 6, 12];

function chip(active: boolean) {
  return `min-h-11 rounded-full border px-3 text-sm ${
    active
      ? "border-amber-600 bg-amber-600 text-white"
      : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
  }`;
}

function toggle<T>(list: T[] | undefined, v: T): T[] {
  const cur = list ?? [];
  return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
}

const MINIMUMS = [
  ["Nota global mínima", "minOverall"],
  ["Local mínimo", "minLocal"],
  ["Atención mínima", "minService"],
  ["Comida mínima", "minFood"],
] as const;

export function BarFilters({ filters, tags, onApply, onManageTags }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  const h = "mb-1 block font-medium";

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium">Etiquetas</span>
          <button type="button" onClick={onManageTags} className="min-h-11 px-1 text-sm text-amber-700 underline dark:text-amber-500">
            Gestionar etiquetas
          </button>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-zinc-500">Ningún bar de esta ciudad tiene etiquetas</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const active = draft.tagIds?.includes(t.id) ?? false;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ tagIds: toggle(draft.tagIds, t.id) })}
                  className={chip(active)}
                >
                  {t.name} <span className={active ? "text-amber-100" : "text-zinc-500"}>{t.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {MINIMUMS.map(([label, key]) => (
        <div key={key} className="flex flex-wrap items-center justify-between gap-x-2">
          <span className="font-medium">{label}</span>
          <Stars
            size="sm"
            label={label}
            value={draft[key] ?? null}
            onChange={(v) => set({ [key]: v ?? undefined })}
          />
        </div>
      ))}
      <div>
        <span className={h}>Precio</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => {
            const active = draft.priceLevels?.includes(n) ?? false;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                aria-label={"€".repeat(n)}
                onClick={() => set({ priceLevels: toggle(draft.priceLevels, n) })}
                className={`${chip(active)} flex-1`}
              >
                {"€".repeat(n)}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <span className={h}>Visitado en los últimos</span>
        <div className="flex gap-2">
          {MONTHS.map((m) => {
            const active = draft.visitedWithinMonths === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => set({ visitedWithinMonths: active ? undefined : m })}
                className={`${chip(active)} flex-1`}
              >
                {m === 1 ? "1 mes" : `${m} meses`}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDraft({ text: draft.text })}
          className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-4 font-medium dark:border-zinc-700"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="min-h-11 flex-1 rounded-lg bg-amber-600 px-4 font-medium text-white"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
