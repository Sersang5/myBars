"use client";

import type { ReactNode } from "react";
import { AddCityForm } from "./CitySelector";
import { useCity } from "./CityProvider";

/** Renders the page, or the "add your first city" screen when the user has none. */
export function CityGate({ children }: { children: ReactNode }) {
  const { cities, loading, error, refresh } = useCity();
  if (loading) return <p className="p-4 text-zinc-500">Cargando…</p>;
  if (error && cities.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <p role="alert" className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="min-h-11 rounded-lg bg-amber-600 px-4 font-medium text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (cities.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-semibold">Añade tu primera ciudad</h1>
        <p className="text-zinc-500">Elige la ciudad donde quieres guardar tus bares.</p>
        <AddCityForm />
      </div>
    );
  }
  return <>{children}</>;
}
