"use client";

import { type KeyboardEvent } from "react";
import { normalizeTagName, suggestTags } from "@/lib/bars/tags";
import type { TagSummary } from "@/lib/bars/types";
import { Stars } from "./Stars";

export type TagValue = { name: string; rating: number | null };

type Props = {
  value: TagValue[];
  onChange: (v: TagValue[]) => void;
  /** The half-typed tag; kept by the parent so saving can include it. */
  draft: string;
  onDraftChange: (text: string) => void;
  suggestions: TagSummary[];
};

function tryNormalize(raw: string): string | null {
  try {
    return normalizeTagName(raw);
  } catch {
    return null;
  }
}

export function TagInput({ value, onChange, draft, onDraftChange, suggestions }: Props) {
  function add(raw: string) {
    const name = tryNormalize(raw);
    if (name === null) return;
    if (!value.some((t) => tryNormalize(t.name) === name)) {
      onChange([...value, { name, rating: null }]);
    }
    onDraftChange("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const visible = suggestTags(
    suggestions,
    draft,
    value.map((t) => t.name),
  );
  const typed = tryNormalize(draft);
  const isNew =
    typed !== null && !suggestions.some((s) => s.name === typed) && !value.some((t) => tryNormalize(t.name) === typed);

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {value.map((t, i) => (
          <li
            key={t.name}
            className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 rounded-lg bg-zinc-100 pl-3 dark:bg-zinc-800"
          >
            <span className="min-w-24 flex-1 truncate">{t.name}</span>
            <span className="flex items-center">
              <Stars
                size="sm"
                value={t.rating}
                label={`Valoración de ${t.name}`}
                onChange={(r) => onChange(value.map((x, j) => (j === i ? { ...x, rating: r } : x)))}
              />
              <button
                type="button"
                aria-label={`Quitar ${t.name}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="flex h-11 w-11 items-center justify-center text-xl text-zinc-500"
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Añadir etiqueta…"
        aria-label="Añadir etiqueta"
        enterKeyHint="done"
        maxLength={60}
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
      />
      {(isNew || visible.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {isNew && (
            <button
              type="button"
              onClick={() => add(draft)}
              className="min-h-11 rounded-full bg-amber-600 px-3 text-sm text-white"
            >
              Crear «{typed}»
            </button>
          )}
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => add(s.name)}
              className="min-h-11 rounded-full border border-zinc-300 px-3 text-sm dark:border-zinc-700"
            >
              + {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
