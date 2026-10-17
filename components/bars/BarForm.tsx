"use client";

import { useState } from "react";
import { overallRating } from "@/lib/bars/rating";
import type { Bar } from "@/lib/bars/types";
import { formatRating } from "@/lib/ui/format";
import { PricePicker } from "@/components/PricePicker";
import { Stars } from "@/components/Stars";
import { TagInput, type TagValue } from "@/components/TagInput";

export type BarFormValue = {
  ratingLocal: number | null;
  ratingService: number | null;
  ratingFood: number | null;
  ratingOverallManual: number | null;
  priceLevel: 1 | 2 | 3 | 4 | null;
  notes: string;
  tags: TagValue[];
};

type Props = {
  initial?: Bar;
  tagSuggestions: string[];
  submitLabel: string;
  /** Resolves to an error message, or null on success. */
  onSubmit: (value: BarFormValue) => Promise<string | null>;
};

export function BarForm({ initial, tagSuggestions, submitLabel, onSubmit }: Props) {
  const [ratingLocal, setLocal] = useState<number | null>(initial?.ratingLocal ?? null);
  const [ratingService, setService] = useState<number | null>(initial?.ratingService ?? null);
  const [ratingFood, setFood] = useState<number | null>(initial?.ratingFood ?? null);
  const [manual, setManual] = useState<number | null>(initial?.ratingOverallManual ?? null);
  const [price, setPrice] = useState<1 | 2 | 3 | 4 | null>(initial?.priceLevel ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState<TagValue[]>(initial?.tags.map((t) => ({ name: t.name, rating: t.rating })) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auto = overallRating({
    ratingLocal,
    ratingService,
    ratingFood,
    ratingOverallManual: null,
  } as Bar);

  async function submit() {
    setBusy(true);
    setError(null);
    const err = await onSubmit({
      ratingLocal,
      ratingService,
      ratingFood,
      ratingOverallManual: manual,
      priceLevel: price,
      notes,
      tags,
    });
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  const row = "flex flex-wrap items-center justify-between gap-x-2";
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <div className={row}>
          <span className="font-medium">Local</span>
          <Stars size="sm" value={ratingLocal} onChange={setLocal} label="Local" />
        </div>
        <div className={row}>
          <span className="font-medium">Atención</span>
          <Stars size="sm" value={ratingService} onChange={setService} label="Atención" />
        </div>
        <div className={row}>
          <span className="font-medium">Comida</span>
          <Stars size="sm" value={ratingFood} onChange={setFood} label="Comida" />
        </div>
        <div className={row}>
          <span className="font-medium">Global (opcional)</span>
          <Stars size="sm" value={manual} onChange={setManual} label="Global manual" />
        </div>
        <p className="text-sm text-zinc-500">
          {manual === null
            ? `Automática: ${auto === null ? "Sin valorar" : formatRating(auto)}`
            : "Manual (toca la misma nota para volver a automática)"}
        </p>
      </div>
      <div>
        <span className="mb-1 block font-medium">Precio</span>
        <PricePicker value={price} onChange={(v) => setPrice(v as 1 | 2 | 3 | 4 | null)} />
      </div>
      <div>
        <span className="mb-1 block font-medium">Etiquetas</span>
        <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
      </div>
      <label className="block">
        <span className="mb-1 block font-medium">Notas</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={5000}
          className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 dark:border-zinc-700"
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 w-full rounded-lg bg-amber-600 px-4 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
