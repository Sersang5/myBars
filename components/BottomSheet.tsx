"use client";

import { useEffect, type ReactNode } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <h2 className="py-3 text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-zinc-500"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
