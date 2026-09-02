"use client";

import { Search } from "lucide-react";
import { useSessionStore } from "@/state/sessionStore";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { DevRoleSwitcher } from "@/components/shell/DevRoleSwitcher";
import { DevTrialMenu } from "@/components/shell/DevTrialMenu";
import { NotificationBell } from "@/components/shell/NotificationBell";

export function TopBar() {
  const orgName = useSessionStore((s) => s.session?.org.name);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <span className="size-5 rounded-[5px] bg-accent" aria-hidden />
        {orgName}
      </div>

      {/* Command palette trigger — full palette is a fast-follow; this opens
          nothing yet but reserves the interaction slot per the Shell wireframes. */}
      <button
        type="button"
        className="mx-auto flex w-80 items-center gap-2 rounded-md border border-border bg-surface-alt px-3 py-1.5 text-xs text-text-tertiary hover:border-border-strong"
        disabled
        title="Command palette — coming soon"
      >
        <Search className="size-3.5" />
        Search or jump to...
        <kbd className="ml-auto font-mono text-[10px]">⌘K</kbd>
      </button>

      <div className="flex items-center gap-3">
        <DevTrialMenu />
        <DevRoleSwitcher />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
