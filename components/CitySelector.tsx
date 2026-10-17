"use client";

import { useEffect, useState } from "react";
import { addCityAction } from "@/app/actions/bars";
import type { Suggestion } from "@/lib/places/types";
import { BottomSheet } from "./BottomSheet";
import { useCity } from "./CityProvider";

export function AddCityForm({ onDone }: { onDone?: () => void }) {
  const { setCityId, refresh } = useCity();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}&types=locality`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setSuggestions((await res.json()) as Suggestion[]);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("No se pudo buscar la ciudad");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  async function pick(s: Suggestion) {
    setBusy(true);
    setError(null);
    const res = await addCityAction(s.googlePlaceId);
    if (res.ok) {
      await refresh();
      setCityId(res.data.id);
      setQ("");
      setSuggestions([]);
      onDone?.();
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Busca una ciudad…"
        aria-label="Buscar ciudad"
        autoComplete="off"
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <ul>
        {suggestions.map((s) => (
          <li key={s.googlePlaceId}>
            <button
              type="button"
              disabled={busy}
              onClick={() => pick(s)}
              className="flex min-h-11 w-full flex-col justify-center rounded-lg px-3 text-left disabled:opacity-50"
            >
              <span className="font-medium">{s.mainText}</span>
              <span className="text-sm text-zinc-500">{s.secondaryText}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CitySelector() {
  const { city, cities, setCityId } = useCity();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  function close() {
    setOpen(false);
    setAdding(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-lg font-semibold"
      >
        <span className="truncate">{city?.name ?? "Ciudad"}</span>
        <span aria-hidden className="text-sm text-amber-600">▾</span>
      </button>
      <BottomSheet open={open} onClose={close} title={adding ? "Añadir ciudad" : "Ciudad"}>
        {adding ? (
          <AddCityForm onDone={close} />
        ) : (
          <ul>
            {cities.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCityId(c.id);
                    close();
                  }}
                  aria-current={c.id === city?.id}
                  className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left ${
                    c.id === city?.id ? "font-semibold text-amber-600" : ""
                  }`}
                >
                  {c.name}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-amber-600"
              >
                Añadir ciudad…
              </button>
            </li>
          </ul>
        )}
      </BottomSheet>
    </>
  );
}
