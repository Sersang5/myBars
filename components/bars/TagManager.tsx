"use client";

import { useState } from "react";
import { deleteTagAction, renameTagAction } from "@/app/actions/bars";
import { normalizeTagName } from "@/lib/bars/tags";
import type { TagSummary } from "@/lib/bars/types";

export type TagChange =
  | { kind: "renamed"; tagId: string }
  | { kind: "merged"; fromId: string; intoId: string }
  | { kind: "deleted"; tagId: string };

type Props = {
  tags: TagSummary[];
  /** Called after a successful change, so the caller can reload and fix its filters. */
  onChanged: (change: TagChange) => Promise<void>;
};

function bars(n: number): string {
  return n === 1 ? "1 bar" : `${n} bares`;
}

export function TagManager({ tags, onChanged }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(t: TagSummary) {
    setEditing(t.id);
    setText(t.name);
    setError(null);
  }

  async function rename(t: TagSummary) {
    let name: string;
    try {
      name = normalizeTagName(text);
    } catch {
      setError("El nombre no puede estar vacío");
      return;
    }
    if (name === t.name) {
      setEditing(null);
      return;
    }
    const target = tags.find((x) => x.id !== t.id && x.name === name);
    if (
      target &&
      !window.confirm(
        `Ya existe «${target.name}». ¿Fusionar «${t.name}» con ella? Sus ${bars(t.barCount)} pasarán a «${target.name}».`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await renameTagAction(t.id, name);
    if (res.ok) {
      setEditing(null);
      await onChanged(
        res.data.merged ? { kind: "merged", fromId: t.id, intoId: res.data.tagId } : { kind: "renamed", tagId: t.id },
      );
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  async function remove(t: TagSummary) {
    const uses = t.barCount === 0 ? "" : ` Se quitará de ${bars(t.barCount)}.`;
    if (!window.confirm(`¿Borrar la etiqueta «${t.name}»?${uses}`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteTagAction(t.id);
    if (res.ok) {
      await onChanged({ kind: "deleted", tagId: t.id });
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  if (tags.length === 0) return <p className="text-zinc-500">Aún no tienes etiquetas.</p>;

  const btn = "min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700 disabled:opacity-50";
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Las etiquetas son comunes a todas las ciudades. Renombrar una con el nombre de otra las fusiona.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="space-y-2" aria-label="Etiquetas">
        {tags.map((t) =>
          editing === t.id ? (
            <li key={t.id}>
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void rename(t);
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label={`Nuevo nombre para ${t.name}`}
                  maxLength={60}
                  autoFocus
                  enterKeyHint="done"
                  className="min-h-11 min-w-0 flex-1 basis-40 rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
                />
                <button type="button" onClick={() => setEditing(null)} className={btn}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-11 rounded-lg bg-amber-600 px-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  Guardar
                </button>
              </form>
            </li>
          ) : (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 basis-32">
                <span className="block truncate">{t.name}</span>
                <span className="block text-sm text-zinc-500">{bars(t.barCount)}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => startEdit(t)}
                aria-label={`Renombrar ${t.name}`}
                className={btn}
              >
                Renombrar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(t)}
                aria-label={`Borrar ${t.name}`}
                className={`${btn} text-red-600`}
              >
                Borrar
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
