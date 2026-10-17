"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/bars", label: "Mis Bares" },
  { href: "/pending", label: "Pendientes" },
  { href: "/explore", label: "Explorar" },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-background pb-[env(safe-area-inset-bottom)] dark:border-zinc-800"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center text-sm font-medium ${
                  active ? "text-amber-600" : "text-zinc-500"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
