"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import * as billingApi from "@/lib/api/resources/billing";
import type { PlanState } from "@/lib/api/resources/billing";
import { ApiError } from "@/lib/api/errors";
import type { PlanId } from "@/types/domain";

/**
 * One component for all three places the plan comparison appears (Settings,
 * the trial-ending banner's target, and the expired hard stop) — per the
 * Trial & Plan module's Journey 2 note that these aren't three screens.
 */
export function PlanCards({ planState }: { planState: PlanState }) {
  const session = useSessionStore((s) => s.session);
  const patchSessionOrg = useSessionStore((s) => s.patchSessionOrg);
  const qc = useQueryClient();
  const [confirmed, setConfirmed] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = useMutation({
    mutationFn: (planId: PlanId) => billingApi.choosePlan(planId),
    onSuccess: (_result, planId) => {
      setError(null);
      patchSessionOrg({ plan: planId, planChosenAt: new Date().toISOString() });
      setConfirmed(planId);
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  /**
   * Refreshing plan state is deferred until the confirmation is acknowledged.
   * Doing it in onSuccess would unmount this component mid-flow when it's
   * rendered inside the trial-expired block — that block stops applying the
   * moment a plan exists, so the confirmation would vanish before being read.
   */
  function acknowledge() {
    setConfirmed(null);
    qc.invalidateQueries({ queryKey: ["planState"] });
  }

  const confirmedPlan = billingApi.PLANS.find((p) => p.id === confirmed);

  return (
    <>
      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {billingApi.PLANS.map((plan) => {
          const current = planState.plan === plan.id;
          return (
            <Card
              key={plan.id}
              className={"flex flex-col gap-3 p-4" + (current ? " border-accent ring-1 ring-accent" : "")}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">{plan.name}</p>
                  {current && <Badge variant="accent">Current</Badge>}
                </div>
                <p className="text-xs text-text-tertiary">{plan.seats}</p>
              </div>

              <ul className="flex flex-1 flex-col gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-text-secondary">
                    <Check className="mt-0.5 size-3 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.contactSales ? (
                <Button size="sm" variant="secondary" asChild>
                  <a href="mailto:sales@yughma.com?subject=Enterprise%20plan">Contact sales</a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={current ? "secondary" : "primary"}
                  disabled={current}
                  loading={choose.isPending && choose.variables === plan.id}
                  onClick={() => choose.mutate(plan.id)}
                >
                  {current ? "Current plan" : "Choose"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!confirmed} onOpenChange={(open) => !open && acknowledge()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You&apos;re on the {confirmedPlan?.name} plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            {planState.daysLeft !== null && planState.daysLeft > 0
              ? `Takes effect when your trial ends (in ${planState.daysLeft} ${
                  planState.daysLeft === 1 ? "day" : "days"
                }).`
              : "It's in effect now."}{" "}
            No payment was collected — billing setup comes later.
          </p>
          <DialogFooter>
            <Button onClick={acknowledge}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
