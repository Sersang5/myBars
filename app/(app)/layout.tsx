import type { ReactNode } from "react";
import { CityGate } from "@/components/CityGate";
import { CityProvider } from "@/components/CityProvider";
import { CitySelector } from "@/components/CitySelector";
import { TabBar } from "@/components/TabBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CityProvider>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center border-b border-zinc-200 bg-background px-2 pt-[env(safe-area-inset-top)] dark:border-zinc-800">
          <CitySelector />
        </header>
        <main className="flex-1 pb-20">
          <CityGate>{children}</CityGate>
        </main>
      </div>
      <TabBar />
    </CityProvider>
  );
}
