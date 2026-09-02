"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ShellMode = "learning" | "manage";

interface UiState {
  mode: ShellMode;
  sidebarCollapsed: boolean;
  setMode: (mode: ShellMode) => void;
  toggleMode: () => void;
  toggleSidebar: () => void;
}

/**
 * Which mode a user last used persists across sessions — an Org Admin who
 * lives in Manage mode shouldn't be dropped into Learning Home every login
 * (Shell module, Journey 4). Per-tab "return to exact position on switch"
 * is a follow-up, not built in this first slice.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mode: "learning",
      sidebarCollapsed: false,
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === "learning" ? "manage" : "learning" })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "yughma-ui" },
  ),
);
