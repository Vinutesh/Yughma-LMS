import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { TrialGate } from "@/components/billing/TrialGate";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-canvas">
      <TrialBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <TrialGate>{children}</TrialGate>
          </main>
        </div>
      </div>
    </div>
  );
}
