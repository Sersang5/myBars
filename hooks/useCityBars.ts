"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listBarsAction, listTagsAction } from "@/app/actions/bars";
import { useCity } from "@/components/CityProvider";
import type { Bar } from "@/lib/bars/types";
import type { TagRow } from "@/lib/db/types";

/**
 * Loads the current city's bars with the given status, plus all tags.
 * Responses from superseded requests (city or status changed, newer reload) are ignored.
 * `reload` resolves to the fresh bars, or null if the request failed or was superseded.
 */
export function useCityBars(status: "visited" | "pending", errorMessage: string) {
  const { city } = useCity();
  const cityId = city?.id ?? null;
  const [bars, setBars] = useState<Bar[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const invalidate = () => {
    latest.current++;
  };

  const reload = useCallback(async (): Promise<Bar[] | null> => {
    if (!cityId) return null;
    const id = ++latest.current;
    let result: Bar[] | null = null;
    try {
      const [b, t] = await Promise.all([listBarsAction(cityId, status), listTagsAction()]);
      if (id !== latest.current) return null;
      if (b.ok) {
        setBars(b.data);
        setError(null);
        result = b.data;
      } else {
        setError(b.error);
      }
      if (t.ok) setTags(t.data);
    } catch {
      if (id !== latest.current) return null;
      setError(errorMessage);
    }
    setLoading(false);
    return result;
  }, [cityId, status, errorMessage]);

  useEffect(() => {
    setLoading(true);
    void reload();
    return () => {
      invalidate();
    };
  }, [reload]);

  return { bars, tags, loading, error, reload };
}
