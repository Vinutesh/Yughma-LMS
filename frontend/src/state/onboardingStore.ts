"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OnboardingState {
  orgBasicsDone: boolean;
  personaDone: boolean;
  inviteCount: number | null; // null = skipped, 0+ = invites sent
  /** Manually hidden from the checklist widget, independent of completion. */
  dismissed: boolean;
  setOrgBasicsDone: (v: boolean) => void;
  setPersonaDone: (v: boolean) => void;
  setInviteCount: (v: number | null) => void;
  dismiss: () => void;
  reset: () => void;
}

const initial = {
  orgBasicsDone: false,
  personaDone: false,
  inviteCount: null as number | null,
  dismissed: false,
};

/**
 * Tracks which Onboarding wizard steps were completed vs. skipped — the
 * connective tissue between the wizard (Flow A) and the Dashboard's
 * checklist widget (Flow B), per LMS/docs/modules/02-onboarding.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initial,
      setOrgBasicsDone: (v) => set({ orgBasicsDone: v }),
      setPersonaDone: (v) => set({ personaDone: v }),
      setInviteCount: (v) => set({ inviteCount: v }),
      dismiss: () => set({ dismissed: true }),
      reset: () => set({ ...initial }),
    }),
    { name: "yughma-onboarding" },
  ),
);

export function onboardingIncomplete(s: OnboardingState) {
  return !s.orgBasicsDone || !s.personaDone || s.inviteCount === null;
}
