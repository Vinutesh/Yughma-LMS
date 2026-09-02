"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "@/state/sessionStore";
import { TrialExpiredBlock } from "@/components/billing/TrialExpiredBlock";
import * as billingApi from "@/lib/api/resources/billing";

/**
 * Swaps the shell's content area for the trial-expired stop once the trial is
 * past with no plan chosen. Renders children untouched in every other case, so
 * a healthy trial costs nothing but one cached query.
 */
export function TrialGate({ children }: { children: ReactNode }) {
  const org = useSessionStore((s) => s.session?.org);

  const { data: planState, isLoading } = useQuery({
    queryKey: ["planState", org?.id],
    queryFn: () => billingApi.getPlanState(),
    enabled: !!org,
  });

  // Don't flash real content before we know whether the org is blocked.
  if (isLoading) return null;
  if (planState?.expired) return <TrialExpiredBlock />;
  return <>{children}</>;
}
