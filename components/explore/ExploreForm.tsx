"use client";

import { useState, type FormEvent } from "react";
import { useCity } from "@/components/CityProvider";
import { ResultCard } from "@/components/explore/ResultCard";
import type { ExploreResponse } from "@/lib/explorer/run";

const SUGGESTIONS = ["tortilla", "café de especialidad", "croquetas", "vermut"];
const RADII = [1000, 2000, 5000] as const;
const NOVELTY = [
  { value: "auto", label: "Auto" },
  { value: "new", label: "Solo nuevos" },
  { value: "include", label: "Incluir los míos" },
] as const;

type Novelty = (typeof NOVELTY)[number]["value"];
type ScopeKind = "city" | "near";

const GEO_NOTICE = "No se pudo obtener tu ubicación";

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export function ExploreForm() {
  const { city } = useCity();
  const [prompt, setPrompt] = useState("");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("city");
  const [radiusM, setRadiusM] = useState<(typeof RADII)[number]>(2000);
  const [novelty, setNovelty] = useState<Novelty>("auto");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ExploreResponse | null>(null);

  const seg = (active: boolean) =>
    `min-h-11 flex-1 rounded-lg border px-2 text-sm font-medium ${
      active ? "border-amber-600 bg-amber-600 text-white" : "border-zinc-300 dark:border-zinc-700"
    }`;

  async function chooseNear() {
    setNotice(null);
    setScopeKind("near");
    try {
      await getPosition();
    } catch {
      setScopeKind("city");
      setNotice(GEO_NOTICE);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;
    setError(null);
    setNotice(null);
    setResponse(null);
    setLoading(true);
    try {
      let scope: Record<string, unknown> | null = null;
      if (scopeKind === "near") {
        try {
          scope = { kind: "near", ...(await getPosition()), radiusM };
        } catch {
          setScopeKind("city");
          setNotice(GEO_NOTICE);
        }
      }
      if (!scope) {
        if (!city) return;
        scope = { kind: "city", cityId: city.id };
      }
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, scope, novelty }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data as { message?: string } | null)?.message;
        setError(message ?? (res.status === 401 ? "Tu sesión ha caducado" : "Algo ha fallado. Inténtalo de nuevo."));
        return;
      }
      setResponse(data as ExploreResponse);
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Explorar</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">¿Qué te apetece?</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 bg-transparent p-2 text-base dark:border-zinc-700"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="min-h-11 rounded-full border border-zinc-300 px-3 text-sm dark:border-zinc-700"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2" role="group" aria-label="Ámbito">
          <button type="button" aria-pressed={scopeKind === "city"} onClick={() => setScopeKind("city")} className={seg(scopeKind === "city")}>
            Ciudad
          </button>
          <button type="button" aria-pressed={scopeKind === "near"} onClick={chooseNear} className={seg(scopeKind === "near")}>
            Cerca de mí
          </button>
        </div>
        {scopeKind === "near" && (
          <div className="flex gap-2" role="group" aria-label="Radio">
            {RADII.map((r) => (
              <button key={r} type="button" aria-pressed={radiusM === r} onClick={() => setRadiusM(r)} className={seg(radiusM === r)}>
                {r / 1000} km
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2" role="group" aria-label="Novedad">
          {NOVELTY.map((n) => (
            <button key={n.value} type="button" aria-pressed={novelty === n.value} onClick={() => setNovelty(n.value)} className={seg(novelty === n.value)}>
              {n.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim() || (scopeKind === "city" && !city)}
          className="min-h-11 w-full rounded-lg bg-amber-600 px-3 font-medium text-white disabled:opacity-60"
        >
          Buscar
        </button>
      </form>

      {notice && (
        <p role="status" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-3" aria-busy="true">
          <p className="text-sm text-zinc-500">Buscando y leyendo reseñas…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {response && (
        <div className="space-y-3">
          {response.message && (
            <p role="status" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              {response.message}
            </p>
          )}
          <ul className="space-y-3">
            {response.results.map((r) => (
              <ResultCard key={r.googlePlaceId} result={r} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
