"use client";

import type { ReactNode } from "react";
import { AddCityForm } from "./CitySelector";
import { useCity } from "./CityProvider";

/** Renders the page, or the "add your first city" screen when the user has none. */
export function CityGate({ children }: { children: ReactNode }) {
  const { cities, loading, error } = useCity();
  if (loading) return <p className="p-4 text-zinc-500">Cargando…</p>;
  if (cities.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-semibold">Añade tu primera ciudad</h1>
        <p className="text-zinc-500">Elige la ciudad donde quieres guardar tus bares.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <AddCityForm />
      </div>
    );
  }
  return <>{children}</>;
}
