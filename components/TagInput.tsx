"use client";

import { useState, type KeyboardEvent } from "react";
import { normalizeTagName } from "@/lib/bars/tags";
import { Stars } from "./Stars";

export type TagValue = { name: string; rating: number | null };

type Props = {
  value: TagValue[];
  onChange: (v: TagValue[]) => void;
  suggestions: string[];
};

export function TagInput({ value, onChange, suggestions }: Props) {
  const [text, setText] = useState("");

  function add(raw: string) {
    let name: string;
    try {
      name = normalizeTagName(raw);
    } catch {
      return;
    }
    if (!value.some((t) => normalizeTagName(t.name) === name)) {
      onChange([...value, { name, rating: null }]);
    }
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const taken = new Set(value.map((t) => normalizeTagName(t.name)));
  const query = text.trim().toLowerCase();
  const visible = suggestions
    .filter((s) => !taken.has(s.toLowerCase()) && (query === "" || s.toLowerCase().includes(query)))
    .slice(0, 8);

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
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Añadir etiqueta…"
        enterKeyHint="done"
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
      />
      {visible.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visible.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="min-h-11 rounded-full border border-zinc-300 px-3 text-sm dark:border-zinc-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
