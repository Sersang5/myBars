"use client";

import { useState } from "react";
import { addPendingBarAction } from "@/app/actions/bars";
import type { ExploreResult } from "@/lib/explorer/run";
import { formatDistance, formatGoogle, formatPrice } from "@/lib/ui/format";

type SaveState = "idle" | "saving" | "saved" | "owned";

export function ResultCard({ result }: { result: ExploreResult }) {
  const [save, setSave] = useState<SaveState>(
    result.status === "pending" ? "saved" : result.status === "visited" ? "owned" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const price = formatPrice(result.priceLevel);

  async function onSave() {
    if (save !== "idle") return;
    setSave("saving");
    setError(null);
    try {
      const res = await addPendingBarAction(result.googlePlaceId, result.reason);
      if (res.ok) setSave(res.data.existed && result.status === "visited" ? "owned" : "saved");
      else {
        setError(res.error);
        setSave("idle");
      }
    } catch {
      setError("No se pudo guardar");
      setSave("idle");
    }
  }

  const btn = "flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 font-medium dark:border-zinc-700";
  const rating =
    result.rating === null ? "Sin valoración" : formatGoogle(result.rating, result.userRatingCount).replace("Google: ", "");
  const label = save === "owned" ? "Ya en Mis Bares" : save === "saved" ? "Guardado" : "Guardar en Pendientes";
  return (
    <li className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold">{result.name}</p>
          {result.status === "visited" && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">En Mis Bares</span>
          )}
          {result.status === "pending" && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">En Pendientes</span>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {[rating, price, formatDistance(result.distanceM)].filter(Boolean).join(" · ")}
        </p>
        {result.openNow === true && <p className="text-sm text-green-700">Abierto ahora</p>}
        {result.reason && <p className="text-sm">{result.reason}</p>}
        {result.quote && <p className="text-sm italic text-zinc-600 dark:text-zinc-400">“{result.quote}”</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={save !== "idle"}
          className="min-h-11 rounded-lg bg-amber-600 px-3 font-medium text-white disabled:opacity-60"
        >
          {label}
        </button>
        <a href={result.mapsUrl} target="_blank" rel="noopener noreferrer" className={btn}>
          Abrir en Maps
        </a>
      </div>
    </li>
  );
}
