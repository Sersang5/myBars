"use client";

import { useEffect, useState } from "react";
import type { LatLng, Suggestion } from "@/lib/places/types";

type Props = { center: LatLng | null; onPick: (s: Suggestion) => void };

export function PlaceSearch({ center, onPick }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lat = center?.lat;
  const lng = center?.lng;

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const params = new URLSearchParams({ q });
        if (lat !== undefined && lng !== undefined) {
          params.set("lat", String(lat));
          params.set("lng", String(lng));
        }
        const res = await fetch(`/api/places/autocomplete?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResults((await res.json()) as Suggestion[]);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("No se pudo buscar lugares");
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, lat, lng]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Busca un bar o restaurante…"
        aria-label="Buscar lugar"
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {busy && <p className="text-sm text-zinc-500">Buscando…</p>}
      {!busy && !error && text.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-zinc-500">Sin resultados</p>
      )}
      <ul>
        {results.map((s) => (
          <li key={s.googlePlaceId}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="block min-h-11 w-full border-b border-zinc-200 py-2 text-left dark:border-zinc-800"
            >
              <span className="block font-medium">{s.mainText}</span>
              <span className="block text-sm text-zinc-500">{s.secondaryText}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
