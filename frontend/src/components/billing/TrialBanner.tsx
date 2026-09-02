"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import * as billingApi from "@/lib/api/resources/billing";

/**
 * Only appears in the trial's last week (Journey 1 — no nagging while there's
 * plenty of time). Dismissal is component state, so it's per-session and
 * returns next login, since the deadline is genuinely time-sensitive.
 * Shown only to accounts that can actually act on it.
 */
export function TrialBanner() {
  const org = useSessionStore((s) => s.session?.org);
  const canChoosePlan = usePermission("settings", "manage");
  const [dismissed, setDismissed] = useState(false);

  const { data: planState } = useQuery({
    queryKey: ["planState", org?.id],
    queryFn: () => billingApi.getPlanState(),
    enabled: !!org,
  });

  if (!planState?.endingSoon || !canChoosePlan || dismissed) return null;

  const { daysLeft } = planState;

  return (
    <div className="flex items-center justify-center gap-3 border-b border-border bg-warning-bg px-4 py-2 text-xs font-medium text-warning">
      <span>
        {daysLeft} {daysLeft === 1 ? "day" : "days"} left in your trial
      </span>
      <Link href="/manage/plan" className="font-semibold underline">
        Choose a plan
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss trial notice"
        className="ml-auto rounded p-0.5 hover:bg-warning/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
