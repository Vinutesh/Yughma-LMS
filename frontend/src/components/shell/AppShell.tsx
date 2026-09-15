"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { TrialGate } from "@/components/billing/TrialGate";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-canvas">
      <TrialBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenNav={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-auto">
            <TrialGate>
              {/* Keyed by pathname so each real navigation gets its own
                  fade + 12px slide-in — a subsequent state update on the
                  SAME page (a query refetch, a dialog toggle) never
                  replays it, only an actual route change does. */}
              {/* mode="wait" (not the default, simultaneous) deliberately —
                  without it, the exiting old page and the entering new page
                  are both in normal document flow at once (AnimatePresence
                  doesn't reposition an exiting child), so they visibly
                  overlap for the transition's duration. Sequencing them
                  costs one short exit first, which stays unnoticeable at
                  this duration. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </TrialGate>
          </main>
        </div>
      </div>
    </div>
  );
}
