"use client";

import { useState } from "react";
import { addVisitAction, deleteBarAction } from "@/app/actions/bars";
import { overallRating } from "@/lib/bars/rating";
import type { Bar } from "@/lib/bars/types";
import { formatGoogle, formatPrice, formatRating } from "@/lib/ui/format";
import { Stars } from "@/components/Stars";

type Props = {
  bar: Bar;
  notice?: string | null;
  onChanged: () => Promise<void>;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
};

export function BarDetail({ bar, notice, onChanged, onEdit, onDeleted }: Props) {
  const [visiting, setVisiting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overall = overallRating(bar);
  const visits = [...bar.visits].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  async function saveVisit() {
    setBusy(true);
    setError(null);
    const res = await addVisitAction(bar.id, note.trim() === "" ? null : note.trim());
    if (res.ok) {
      setVisiting(false);
      setNote("");
      await onChanged();
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar "${bar.name}" de Mis Bares?`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteBarAction(bar.id);
    if (res.ok) {
      await onDeleted();
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  const row = "flex flex-wrap items-center justify-between gap-x-2";
  const btn = "min-h-11 rounded-lg border border-zinc-300 px-4 font-medium dark:border-zinc-700";
  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          {notice}
        </p>
      )}
      <div>
        <p className="text-sm text-zinc-500">
          {[formatPrice(bar.priceLevel), bar.address].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-zinc-500">{formatGoogle(bar.googleRating, bar.googleRatingCount)}</p>
      </div>
      <div>
        <div className={row}>
          <span className="font-medium">Global</span>
          <span className="flex items-center gap-1">
            <Stars size="sm" value={overall} label="Nota global" />
            <span className="text-sm">{overall === null ? "Sin valorar" : formatRating(overall)}</span>
          </span>
        </div>
        <div className={row}>
          <span>Local</span>
          <Stars size="sm" value={bar.ratingLocal} label="Local" />
        </div>
        <div className={row}>
          <span>Atención</span>
          <Stars size="sm" value={bar.ratingService} label="Atención" />
        </div>
        <div className={row}>
          <span>Comida</span>
          <Stars size="sm" value={bar.ratingFood} label="Comida" />
        </div>
      </div>
      {bar.tags.length > 0 && (
        <ul className="space-y-1">
          {bar.tags.map((t) => (
            <li key={t.tagId} className={row}>
              <span>{t.name}</span>
              <Stars size="sm" value={t.rating} label={`Valoración de ${t.name}`} />
            </li>
          ))}
        </ul>
      )}
      {bar.notes && <p className="whitespace-pre-wrap">{bar.notes}</p>}
      <div>
        <h3 className="mb-1 font-medium">Visitas ({visits.length})</h3>
        {visits.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin visitas</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {visits.map((v) => (
              <li key={v.id}>
                <span className="font-medium">{v.date}</span>
                {v.note && <span className="text-zinc-500"> — {v.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {visiting ? (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Nota de la visita (opcional)"
            aria-label="Nota de la visita"
            className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 dark:border-zinc-700"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setVisiting(false)} className={`${btn} flex-1`}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveVisit()}
              className="min-h-11 flex-1 rounded-lg bg-amber-600 px-4 font-medium text-white disabled:opacity-50"
            >
              Guardar visita
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setVisiting(true)}
          className="min-h-11 w-full rounded-lg bg-amber-600 px-4 font-medium text-white"
        >
          Registrar visita
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={bar.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${btn} flex items-center`}>
          Abrir en Maps
        </a>
        <button type="button" onClick={onEdit} className={btn}>
          Editar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className={`${btn} text-red-600 disabled:opacity-50`}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
