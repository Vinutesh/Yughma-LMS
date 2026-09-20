"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useSessionStore } from "@/state/sessionStore";

/**
 * Dev-only — shifts the org's trial deadline so the three time-dependent Trial
 * & Plan states (quiet, ending-soon banner, expired hard stop) can be seen
 * without waiting real days. Never ships to a real environment.
 */
const PRESETS: { label: string; days: number }[] = [
  { label: "Mid-trial (22 days left)", days: 22 },
  { label: "Ending soon (5 days left)", days: 5 },
  { label: "Last day (1 day left)", days: 1 },
  { label: "Expired (yesterday)", days: -1 },
];

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function DevTrialMenu() {
  const session = useSessionStore((s) => s.session);
  const patchSessionOrg = useSessionStore((s) => s.patchSessionOrg);
  const qc = useQueryClient();

  if (!session) return null;

  const setTrial = (days: number) => {
    // Clearing the plan too, otherwise a previously chosen plan keeps the
    // expired/banner states permanently suppressed. This only patches the
    // session's own copy of the org — it used to also write to a mock
    // directory store, which nothing has read since the real backend
    // landed.
    const patch = { trialEndsAt: daysFromNow(days), plan: undefined, planChosenAt: undefined };
    patchSessionOrg(patch);
    qc.invalidateQueries({ queryKey: ["planState"] });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-dashed border-warning px-2.5 py-1.5 text-xs font-semibold text-warning hover:bg-warning-bg"
          title="Dev only: shift the trial deadline"
        >
          <Clock className="size-3.5" />
          Dev: trial
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="motion-menu z-50 min-w-56 rounded-lg border border-border bg-surface p-1.5 shadow-(--shadow-token-md)"
        >
          {PRESETS.map((p) => (
            <DropdownMenu.Item
              key={p.label}
              onSelect={() => setTrial(p.days)}
              className="cursor-pointer rounded-md px-2.5 py-2 text-sm text-text-secondary outline-none hover:bg-surface-alt hover:text-text-primary"
            >
              {p.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
