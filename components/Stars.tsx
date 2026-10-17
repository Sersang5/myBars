"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { nextStarValue, starFromPointer } from "@/lib/ui/stars";

export { starFromPointer };

type Props = {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: "sm" | "lg";
  label?: string;
};

const STAR_PATH =
  "M12 2.5l2.94 6.1 6.56.9-4.8 4.62 1.2 6.58L12 17.5l-5.9 3.2 1.2-6.58L2.5 9.5l6.56-.9z";

export function formatStars(v: number | null): string {
  if (v === null) return "Sin valorar";
  if (v === 1) return "1 estrella";
  return `${String(v).replace(".", ",")} estrellas`;
}

export function Stars({ value, onChange, size = "lg", label }: Props) {
  const interactive = !!onChange;
  const box = size === "lg" ? "h-11 w-11" : "h-7 w-7";
  // Interactive stars always get a 44px hit area (22px per half), even when drawn small.
  const hit = interactive ? "h-11 w-11" : box;
  const current = value ?? 0;

  function onStarClick(e: MouseEvent<HTMLSpanElement>, index: number) {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onChange(nextStarValue(value, starFromPointer(e.clientX - rect.left, rect.width, index)));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onChange) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(5, current + 0.5));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = current - 0.5;
      onChange(next < 0.5 ? null : next);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onChange(null);
    }
  }

  return (
    <div
      role={interactive ? "slider" : "img"}
      aria-label={label ?? "Valoración"}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 5 : undefined}
      aria-valuenow={interactive ? current : undefined}
      aria-valuetext={formatStars(value)}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-amber-600"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, current - i));
        return (
          <span
            key={i}
            onClick={interactive ? (e) => onStarClick(e, i) : undefined}
            className={`flex items-center justify-center ${hit} ${interactive ? "cursor-pointer" : ""}`}
          >
            <span className={`relative block ${box}`}>
            <svg viewBox="0 0 24 24" className={`absolute left-0 top-0 ${box}`} aria-hidden>
              <path
                d={STAR_PATH}
                strokeLinejoin="round"
                className="fill-transparent stroke-zinc-400 dark:stroke-zinc-600"
              />
            </svg>
            <span className="absolute left-0 top-0 h-full overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" className={`block max-w-none ${box}`} aria-hidden>
                <path d={STAR_PATH} strokeLinejoin="round" className="fill-amber-600 stroke-amber-600" />
              </svg>
            </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
