"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "@/state/sessionStore";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { DevTrialMenu } from "@/components/shell/DevTrialMenu";
import { NotificationBell } from "@/components/shell/NotificationBell";
import * as orgsApi from "@/lib/api/resources/organizations";

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const org = useSessionStore((s) => s.session?.org);

  // The bucket is private, so a stored logo key resolves to a short-lived
  // signed URL — refetched periodically well before it expires (the
  // backend mints hour-long ones) so a long-open tab's logo never goes
  // stale mid-session. Skipped entirely when the org hasn't set one, so
  // most orgs (still on the fallback mark) never fire this query at all.
  const { data: logoUrl } = useQuery({
    queryKey: ["orgLogoUrl", org?.id],
    queryFn: () => orgsApi.getOrgLogoUrl(),
    enabled: !!org?.logoUrl,
    staleTime: 45 * 60 * 1000,
    refetchInterval: 45 * 60 * 1000,
  });

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
        {logoUrl ? (
          // Company-supplied logo — real, arbitrary aspect ratio, so a plain
          // <img> (not next/image, which needs a fixed box that would crop
          // or distort a logo that isn't square like the fallback mark is).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-5 w-auto shrink-0 rounded-[5px]" />
        ) : (
          <Image src="/mark-64.png" alt="" width={20} height={20} className="shrink-0 rounded-[5px] shadow-(--shadow-token-sm)" />
        )}
        <span className="truncate">{org?.name}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {process.env.NODE_ENV !== "production" && <DevTrialMenu />}
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
