"use client";

import { useCity } from "@/components/CityProvider";

export type SavedCity = { cityId: string; cityName: string | null };

/**
 * After a save, refreshes the city list and returns the saved bar's city when it
 * differs from the selected one (so the UI can tell the user where it went).
 */
export function useSavedCity() {
  const { city, refresh, setCityId } = useCity();
  async function check(res: { cityId: string | null; cityName: string | null }): Promise<SavedCity | null> {
    await refresh();
    if (!res.cityId || res.cityId === city?.id) return null;
    return { cityId: res.cityId, cityName: res.cityName };
  }
  return { check, switchTo: (c: SavedCity) => setCityId(c.cityId) };
}

/** "Guardado en <ciudad>" with a "Ver" button that switches to that city. */
export function SavedElsewhere({ saved, onView }: { saved: SavedCity; onView: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
      <span>Guardado en {saved.cityName ?? "otra ciudad"}</span>
      <button
        type="button"
        onClick={onView}
        className="min-h-11 rounded-lg bg-amber-600 px-4 font-medium text-white"
      >
        Ver
      </button>
    </div>
  );
}
