"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useSessionStore } from "@/state/sessionStore";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { DevTrialMenu } from "@/components/shell/DevTrialMenu";
import { NotificationBell } from "@/components/shell/NotificationBell";

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const orgName = useSessionStore((s) => s.session?.org.name);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open menu"
        className="-ml-1 rounded-md p-1.5 text-text-secondary hover:bg-border/40 hover:text-text-primary md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2 font-display text-[15px] font-bold text-text-primary">
        <Image src="/mark-64.png" alt="" width={20} height={20} className="shrink-0 rounded-[5px] shadow-(--shadow-token-sm)" />
        <span className="truncate">{orgName}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {process.env.NODE_ENV !== "production" && <DevTrialMenu />}
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
