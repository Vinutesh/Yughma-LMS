"use client";

import Image from "next/image";
import { useSessionStore } from "@/state/sessionStore";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { DevTrialMenu } from "@/components/shell/DevTrialMenu";
import { NotificationBell } from "@/components/shell/NotificationBell";

export function TopBar() {
  const orgName = useSessionStore((s) => s.session?.org.name);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Image src="/mark-64.png" alt="" width={20} height={20} className="rounded-[5px]" />
        {orgName}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {process.env.NODE_ENV !== "production" && <DevTrialMenu />}
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
