"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import * as billingApi from "@/lib/api/resources/billing";
import { PlanCards } from "@/components/billing/PlanCards";

/**
 * Journey 3's hard stop, replacing the shell's content area. The Org Admin gets
 * the plan cards embedded directly — they're already blocked, so don't make
 * them navigate further. Everyone else gets an informational message, since
 * they have no power to act on it. Shell chrome stays reachable either way.
 *
 * Open design question carried from the module's Journey 3: exactly how locked
 * a non-admin's experience should get. This blocks the content area but leaves
 * the profile menu and logout usable.
 */
export function TrialExpiredBlock() {
  const org = useSessionStore((s) => s.session?.org);
  const canChoosePlan = usePermission("settings", "manage");

  const { data: planState } = useQuery({
    queryKey: ["planState", org?.id],
    queryFn: () => billingApi.getPlanState(),
    enabled: !!org,
  });

  if (!planState) return null;

  if (!canChoosePlan) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="flex max-w-md flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            Your organization&apos;s trial has ended
          </p>
          <p className="text-xs text-text-tertiary">
            An Org Admin needs to choose a plan to continue.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-xl font-semibold text-text-primary">Your trial has ended</h1>
      <p className="mb-5 mt-1 text-sm text-text-secondary">
        Choose a plan to keep using {org?.name}&apos;s workspace.
      </p>
      <PlanCards planState={planState} />
    </div>
  );
}
