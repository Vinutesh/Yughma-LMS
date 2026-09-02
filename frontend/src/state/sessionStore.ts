"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization, Session } from "@/types/domain";
import * as authApi from "@/lib/api/resources/auth";
import { ApiError } from "@/lib/api/errors";

interface SessionState {
  session: Session | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  /** Dev-only: swap the active session to a different seeded user, bypassing
   * password auth — how the role switcher demonstrates permission/nav
   * scoping without a real backend. Never exposed outside dev tooling. */
  loginAsUserId: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Reflects an org edit (Organization Management's General tab) into the
   * cached session immediately — e.g. so the top bar org label updates
   * without a full session refetch. */
  patchSessionOrg: (patch: Partial<Organization>) => void;
  /** Same idea, for the caller's own user record — e.g. so
   * `mustChangePassword` flips to `false` the moment `auth.changePassword`
   * succeeds, without a full session refetch. */
  patchSessionUser: (patch: Partial<Session["user"]>) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      status: "idle",

      login: async (email, password) => {
        set({ status: "loading" });
        try {
          const session = await authApi.login(email, password);
          set({ session, status: "authenticated" });
        } catch (err) {
          set({ status: "unauthenticated" });
          throw err;
        }
      },

      /** Retired now that auth is real — see `DevRoleSwitcher.tsx`. Left in
       * place (rather than removed) only so any lingering caller fails loudly
       * instead of silently doing nothing. */
      loginAsUserId: async () => {
        throw new ApiError("forbidden", "Dev role switching is unavailable against the real backend.");
      },

      logout: async () => {
        await authApi.logout();
        set({ session: null, status: "unauthenticated" });
      },

      patchSessionOrg: (patch) =>
        set((s) => (s.session ? { session: { ...s.session, org: { ...s.session.org, ...patch } } } : s)),

      patchSessionUser: (patch) =>
        set((s) => (s.session ? { session: { ...s.session, user: { ...s.session.user, ...patch } } } : s)),
    }),
    {
      name: "yughma-session",
      partialize: (state) => ({ session: state.session, status: state.status }),
    },
  ),
);

export { ApiError };
