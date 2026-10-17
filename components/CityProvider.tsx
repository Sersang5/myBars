"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { listCitiesAction } from "@/app/actions/bars";
import type { CityRow } from "@/lib/db/types";

const STORAGE_KEY = "mybars.cityId";

type CityContextValue = {
  city: CityRow | null;
  cities: CityRow[];
  setCityId(id: string): void;
  refresh(): Promise<void>;
  loading: boolean;
  error: string | null;
};

const CityContext = createContext<CityContextValue | null>(null);

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable; selection just won't persist
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [cityId, setCityIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listCitiesAction();
      if (res.ok) {
        setCities(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch {
      setError("No se pudieron cargar las ciudades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCityIdState(readStored());
    void refresh();
  }, [refresh]);

  const setCityId = useCallback((id: string) => {
    setCityIdState(id);
    writeStored(id);
  }, []);

  const value = useMemo<CityContextValue>(() => {
    const city = cities.find((c) => c.id === cityId) ?? cities[0] ?? null;
    return { city, cities, setCityId, refresh, loading, error };
  }, [cities, cityId, setCityId, refresh, loading, error]);

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside <CityProvider>");
  return ctx;
}
