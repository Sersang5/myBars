"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPendingBarAction,
  deleteBarAction,
  listBarsAction,
  listTagsAction,
  markVisitedAction,
} from "@/app/actions/bars";
import { BarForm, type BarFormValue } from "@/components/bars/BarForm";
import { PlaceSearch } from "@/components/bars/PlaceSearch";
import { BottomSheet } from "@/components/BottomSheet";
import { useCity } from "@/components/CityProvider";
import { PendingCard } from "@/components/pending/PendingCard";
import { sortPending } from "@/lib/bars/query";
import type { Bar } from "@/lib/bars/types";
import type { TagRow } from "@/lib/db/types";
import type { Suggestion } from "@/lib/places/types";

type Mode = { kind: "list" } | { kind: "search" } | { kind: "visit"; barId: string };

export default function PendingPage() {
  const router = useRouter();
  const { city } = useCity();
  const cityId = city?.id ?? null;
  const [bars, setBars] = useState<Bar[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  const load = useCallback(async () => {
    if (!cityId) return;
    try {
      const [b, t] = await Promise.all([listBarsAction(cityId, "pending"), listTagsAction()]);
      if (b.ok) {
        setBars(b.data);
        setError(null);
      } else {
        setError(b.error);
      }
      if (t.ok) setTags(t.data);
    } catch {
      setError("No se pudieron cargar los pendientes");
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const sorted = useMemo(() => sortPending(bars), [bars]);
  const close = () => setMode({ kind: "list" });
  const visitBar = mode.kind === "visit" ? bars.find((b) => b.id === mode.barId) : undefined;

  async function add(place: Suggestion) {
    setActionError(null);
    setNotice(null);
    const res = await addPendingBarAction(place.googlePlaceId, null);
    close();
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    if (res.data.existed) setNotice("Ya estaba en tu lista");
    await load();
  }

  async function markVisited(barId: string, value: BarFormValue): Promise<string | null> {
    const res = await markVisitedAction(barId, value);
    if (!res.ok) return res.error;
    router.push("/bars");
    return null;
  }

  async function remove(bar: Bar) {
    if (!window.confirm(`¿Quitar "${bar.name}" de Pendientes?`)) return;
    setActionError(null);
    const res = await deleteBarAction(bar.id);
    if (res.ok) await load();
    else setActionError(res.error);
  }

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-2xl font-semibold">Pendientes</h1>
      {notice && (
        <p role="status" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          {notice}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-red-600">
          {actionError}
        </p>
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
      ) : sorted.length === 0 ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-lg font-medium">No tienes bares pendientes</p>
          <p className="text-zinc-500">Descubre sitios nuevos para visitar.</p>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center rounded-lg bg-amber-600 px-4 font-medium text-white"
          >
            Explorar
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((bar) => (
            <PendingCard
              key={bar.id}
              bar={bar}
              onVisited={() => setMode({ kind: "visit", barId: bar.id })}
              onRemove={() => void remove(bar)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setMode({ kind: "search" })}
        aria-label="Añadir pendiente"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-3xl text-white shadow-lg"
      >
        +
      </button>

      <BottomSheet open={mode.kind === "search"} onClose={close} title="Añadir pendiente">
        <PlaceSearch
          center={city && city.lat !== null && city.lng !== null ? { lat: city.lat, lng: city.lng } : null}
          onPick={(place) => void add(place)}
        />
      </BottomSheet>

      <BottomSheet open={mode.kind === "visit" && !!visitBar} onClose={close} title={visitBar?.name ?? ""}>
        {mode.kind === "visit" && visitBar && (
          <BarForm
            initial={visitBar}
            tagSuggestions={tags.map((t) => t.name)}
            submitLabel="Guardar visita"
            onSubmit={(v) => markVisited(visitBar.id, v)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
