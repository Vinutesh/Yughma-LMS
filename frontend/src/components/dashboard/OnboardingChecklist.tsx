"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useOnboardingStore, onboardingIncomplete } from "@/state/onboardingStore";

const ITEMS = [
  { key: "orgBasicsDone" as const, label: "Add your org logo & industry", step: 1 },
  { key: "personaDone" as const, label: "Tell us what you're using this for", step: 2 },
  { key: "inviteDone" as const, label: "Invite your team", step: 3 },
];

/** Dashboard-owned widget closing the loop on skipped Onboarding steps —
 * see LMS/docs/modules/02-onboarding/02-user-flow.md Flow B/C. */
export function OnboardingChecklist() {
  const router = useRouter();
  const state = useOnboardingStore();
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);

  if (state.dismissed || !onboardingIncomplete(state)) return null;

  function isDone(key: (typeof ITEMS)[number]["key"]): boolean {
    if (key === "inviteDone") return state.inviteCount !== null;
    return state[key];
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">Finish setting up your org</span>
        {confirmingDismiss ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-text-tertiary">Dismiss? You can finish later from Settings.</span>
            <button className="font-semibold text-danger" onClick={state.dismiss}>
              Yes
            </button>
            <button
              className="font-semibold text-text-tertiary"
              onClick={() => setConfirmingDismiss(false)}
            >
              No
            </button>
          </span>
        ) : (
          <button
            className="text-text-tertiary hover:text-text-secondary"
            onClick={() => setConfirmingDismiss(true)}
            aria-label="Dismiss checklist"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {ITEMS.filter((i) => !isDone(i.key)).map((item) => (
          <button
            key={item.key}
            onClick={() => router.push(`/onboarding?step=${item.step}`)}
            className="flex items-center gap-2.5 rounded px-1 py-1 text-left text-sm text-text-secondary hover:bg-surface-alt"
          >
            <span className="size-3.5 rounded-full border-1.5 border-border" aria-hidden />
            {item.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
