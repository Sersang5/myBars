"use client";

type Props = { value: number | null; onChange: (v: number | null) => void };

export function PricePicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Precio" className="flex gap-2">
      {[1, 2, 3, 4].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={"€".repeat(n)}
            onClick={() => onChange(active ? null : n)}
            className={`min-h-11 flex-1 rounded-lg border px-2 text-base font-medium ${
              active
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {"€".repeat(n)}
          </button>
        );
      })}
    </div>
  );
}
