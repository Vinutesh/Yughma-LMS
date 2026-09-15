"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, X } from "lucide-react";
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

  const doneCount = ITEMS.filter((i) => isDone(i.key)).length;

  return (
    <Card className="flex flex-col gap-3 border-accent-soft bg-accent-soft/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Finish setting up your org</p>
            <p className="text-[11px] text-text-tertiary">{doneCount} of {ITEMS.length} done</p>
          </div>
        </div>
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
            className="rounded p-1 text-text-tertiary hover:bg-surface-alt hover:text-text-secondary"
            onClick={() => setConfirmingDismiss(true)}
            aria-label="Dismiss checklist"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const done = isDone(item.key);
          return (
            <button
              key={item.key}
              disabled={done}
              onClick={() => router.push(`/onboarding?step=${item.step}`)}
              className={
                "flex items-center gap-2.5 rounded px-1 py-1 text-left text-sm " +
                (done
                  ? "text-text-tertiary line-through"
                  : "text-text-secondary hover:bg-surface/60")
              }
            >
              <span
                className={
                  "flex size-3.5 shrink-0 items-center justify-center rounded-full border-1.5 " +
                  (done ? "border-success bg-success text-white" : "border-border-strong")
                }
                aria-hidden
              >
                {done && <Check className="size-2.5" strokeWidth={3} />}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
