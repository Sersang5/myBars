"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addVisitedBarAction, updateBarAction } from "@/app/actions/bars";
import { BarCard } from "@/components/bars/BarCard";
import { BarDetail } from "@/components/bars/BarDetail";
import { BarFilters } from "@/components/bars/BarFilters";
import { BarForm, type BarFormValue } from "@/components/bars/BarForm";
import { PlaceSearch } from "@/components/bars/PlaceSearch";
import { BottomSheet } from "@/components/BottomSheet";
import { useCity } from "@/components/CityProvider";
import { useCityBars } from "@/hooks/useCityBars";
import { defaultSort, filterBars, sortBars } from "@/lib/bars/query";
import type { BarFilters as Filters, BarSort } from "@/lib/bars/types";
import type { Suggestion } from "@/lib/places/types";
import { madridToday } from "@/lib/server/today";
import { formatRating } from "@/lib/ui/format";

type Mode =
  | { kind: "list" }
  | { kind: "filters" }
  | { kind: "search" }
  | { kind: "new"; place: Suggestion }
  | { kind: "detail"; barId: string; notice?: string }
  | { kind: "edit"; barId: string };

const SORT_LABELS: Record<BarSort, string> = {
  overall: "Nota global",
  tag: "Nota del tag",
  recent: "Más reciente",
  visits: "Más visitado",
  name: "Nombre",
};

function activeCount(f: Filters): number {
  return (
    (f.tagIds?.length ?? 0) +
    (f.minOverall !== undefined ? 1 : 0) +
    (f.minLocal !== undefined ? 1 : 0) +
    (f.minService !== undefined ? 1 : 0) +
    (f.minFood !== undefined ? 1 : 0) +
    (f.priceLevels?.length ?? 0) +
    (f.visitedWithinMonths !== undefined ? 1 : 0)
  );
}

export default function BarsPage() {
  const { city } = useCity();
  const { bars, tags, loading, error, reload: load } = useCityBars("visited", "No se pudieron cargar los bares");
  const [filters, setFilters] = useState<Filters>({});
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<BarSort | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => {
        const text = searchText.trim() === "" ? undefined : searchText;
        return f.text === text ? f : { ...f, text };
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [searchText]);

  const today = madridToday();
  const tagIds = useMemo(() => filters.tagIds ?? [], [filters.tagIds]);
  const effectiveSort: BarSort = sort === "tag" && tagIds.length === 0 ? "overall" : (sort ?? defaultSort(filters));
  const visible = useMemo(
    () => sortBars(filterBars(bars, filters, new Date()), effectiveSort, tagIds[0]),
    [bars, filters, effectiveSort, tagIds],
  );

  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? "Etiqueta";
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const id of tagIds) {
    chips.push({
      key: `tag-${id}`,
      label: tagName(id),
      remove: () => setFilters((f) => ({ ...f, tagIds: f.tagIds?.filter((x) => x !== id) })),
    });
  }
  const minChip = (label: string, key: "minOverall" | "minLocal" | "minService" | "minFood") => {
    const v = filters[key];
    if (v !== undefined) {
      chips.push({
        key,
        label: `${label} ≥ ${formatRating(v)}`,
        remove: () => setFilters((f) => ({ ...f, [key]: undefined })),
      });
    }
  };
  minChip("Global", "minOverall");
  minChip("Local", "minLocal");
  minChip("Atención", "minService");
  minChip("Comida", "minFood");
  for (const p of filters.priceLevels ?? []) {
    chips.push({
      key: `price-${p}`,
      label: "€".repeat(p),
      remove: () => setFilters((f) => ({ ...f, priceLevels: f.priceLevels?.filter((x) => x !== p) })),
    });
  }
  if (filters.visitedWithinMonths !== undefined) {
    chips.push({
      key: "months",
      label: `Últimos ${filters.visitedWithinMonths} ${filters.visitedWithinMonths === 1 ? "mes" : "meses"}`,
      remove: () => setFilters((f) => ({ ...f, visitedWithinMonths: undefined })),
    });
  }

  const n = activeCount(filters);
  const close = () => setMode({ kind: "list" });
  const detailBar =
    mode.kind === "detail" || mode.kind === "edit" ? bars.find((b) => b.id === mode.barId) : undefined;
  const suggestions = tags.map((t) => t.name);

  async function create(place: Suggestion, value: BarFormValue): Promise<string | null> {
    const res = await addVisitedBarAction(place.googlePlaceId, value);
    if (!res.ok) return res.error;
    await load();
    setMode({
      kind: "detail",
      barId: res.data.barId,
      notice: res.data.existed ? "Ya estaba en tu lista" : undefined,
    });
    return null;
  }

  async function update(barId: string, value: BarFormValue): Promise<string | null> {
    const res = await updateBarAction(barId, value);
    if (!res.ok) return res.error;
    await load();
    setMode({ kind: "detail", barId });
    return null;
  }

  return (
    <div className="space-y-3 p-4">
      <h1 className="sr-only">Mis Bares</h1>
      <input
        type="search"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Buscar por nombre, etiqueta o nota…"
        aria-label="Buscar"
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode({ kind: "filters" })}
          className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-3 font-medium dark:border-zinc-700"
        >
          {n > 0 ? `Filtros (${n})` : "Filtros"}
        </button>
        <select
          aria-label="Ordenar por"
          value={effectiveSort}
          onChange={(e) => setSort(e.target.value as BarSort)}
          className="min-h-11 flex-1 rounded-lg border border-zinc-300 bg-background px-2 dark:border-zinc-700"
        >
          {(Object.keys(SORT_LABELS) as BarSort[])
            .filter((s) => s !== "tag" || tagIds.length > 0)
            .map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
        </select>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.remove}
                aria-label={`Quitar filtro ${c.label}`}
                className="min-h-11 rounded-full bg-amber-600 px-3 text-sm text-white"
              >
                {c.label} ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando…</p>
      ) : error ? (
        <div className="space-y-2">
          <p role="alert" className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 rounded-lg bg-amber-600 px-4 font-medium text-white"
          >
            Reintentar
          </button>
        </div>
      ) : bars.length === 0 ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-lg font-medium">Aún no tienes bares</p>
          <p className="text-zinc-500">Añade el primero o descubre sitios nuevos.</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode({ kind: "search" })}
              className="min-h-11 rounded-lg bg-amber-600 px-4 font-medium text-white"
            >
              Añadir bar
            </button>
            <Link
              href="/explore"
              className="flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 font-medium dark:border-zinc-700"
            >
              Explorar
            </Link>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-zinc-500">Ningún bar coincide con los filtros.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((bar) => (
            <BarCard
              key={bar.id}
              bar={bar}
              highlightTagIds={tagIds}
              today={today}
              onOpen={() => setMode({ kind: "detail", barId: bar.id })}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setMode({ kind: "search" })}
        aria-label="Añadir bar"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-3xl text-white shadow-lg"
      >
        +
      </button>

      <BottomSheet open={mode.kind === "filters"} onClose={close} title="Filtros">
        <BarFilters
          filters={filters}
          tags={tags}
          onApply={(f) => {
            setFilters({ ...f, text: filters.text });
            setSort(null);
            close();
          }}
        />
      </BottomSheet>

      <BottomSheet open={mode.kind === "search"} onClose={close} title="Añadir bar">
        <PlaceSearch
          center={city && city.lat !== null && city.lng !== null ? { lat: city.lat, lng: city.lng } : null}
          onPick={(place) => setMode({ kind: "new", place })}
        />
      </BottomSheet>

      <BottomSheet open={mode.kind === "new"} onClose={close} title={mode.kind === "new" ? mode.place.mainText : ""}>
        {mode.kind === "new" && (
          <BarForm
            tagSuggestions={suggestions}
            submitLabel="Guardar"
            onSubmit={(v) => create(mode.place, v)}
          />
        )}
      </BottomSheet>

      <BottomSheet open={mode.kind === "detail" && !!detailBar} onClose={close} title={detailBar?.name ?? ""}>
        {mode.kind === "detail" && detailBar && (
          <BarDetail
            bar={detailBar}
            notice={mode.notice}
            onChanged={async () => { await load(); }}
            onEdit={() => setMode({ kind: "edit", barId: detailBar.id })}
            onDeleted={async () => {
              await load();
              close();
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet open={mode.kind === "edit" && !!detailBar} onClose={close} title="Editar bar">
        {mode.kind === "edit" && detailBar && (
          <BarForm
            initial={detailBar}
            tagSuggestions={suggestions}
            submitLabel="Guardar cambios"
            onSubmit={(v) => update(detailBar.id, v)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
