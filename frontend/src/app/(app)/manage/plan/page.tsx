"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as billingApi from "@/lib/api/resources/billing";
import { PlanCards } from "@/components/billing/PlanCards";

export default function ChoosePlanPage() {
  // Org-level, financial-adjacent: Org Admin only, per the module's Journey 2.
  const canManage = usePermission("settings", "manage");
  const org = useSessionStore((s) => s.session?.org);

  const { data: planState } = useQuery({
    queryKey: ["planState", org?.id],
    queryFn: () => billingApi.getPlanState(),
    enabled: !!org && canManage,
  });

  if (!canManage) return <AccessDenied title="Plans" />;
  if (!planState) return <p className="p-8 text-sm text-text-tertiary">Loading plans...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link
        href="/manage/settings"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Settings
      </Link>

      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">Choose a plan</h1>
        {planState.onTrial && planState.daysLeft !== null && (
          <Badge variant={planState.endingSoon ? "warning" : "neutral"}>
            {planState.daysLeft} {planState.daysLeft === 1 ? "day" : "days"} left in trial
          </Badge>
        )}
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        Nothing is charged today — choosing a plan records what you want when the trial ends.
      </p>

      <PlanCards planState={planState} />
    </div>
  );
}
