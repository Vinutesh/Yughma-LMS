"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/state/uiStore";
import { hasPermission } from "@/config/permissions";
import { useSessionStore } from "@/state/sessionStore";
import { useHasManageAccess } from "@/hooks/usePermission";
import { LEARNING_NAV, MANAGE_NAV } from "@/config/nav";

/** The actual nav content, shared between the always-visible desktop
 * sidebar and the mobile overlay drawer — one source of truth for which
 * items show, so the two never drift apart. `onNavigate` lets the mobile
 * drawer close itself the moment a link is tapped; the desktop rail has
 * nothing to close, so it simply doesn't pass one. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const setMode = useUiStore((s) => s.setMode);
  const hasManageAccess = useHasManageAccess();
  const permissions = useSessionStore((s) => s.session?.permissions ?? []);
  const isPlatform = useSessionStore((s) => s.session?.org.isPlatform ?? false);

  const mode = pathname.startsWith("/manage") ? "manage" : "learning";

  function switchMode(next: "learning" | "manage") {
    setMode(next);
    router.push(next === "learning" ? "/home" : "/manage/dashboard");
    onNavigate?.();
  }

  return (
    <>
      {hasManageAccess && (
        <div className="mb-2 flex rounded-lg bg-border/60 p-0.5">
          <ModeTab active={mode === "learning"} onClick={() => switchMode("learning")}>
            Learning
          </ModeTab>
          <ModeTab active={mode === "manage"} onClick={() => switchMode("manage")}>
            Manage
          </ModeTab>
        </div>
      )}

      <nav className="flex flex-col gap-0.5">
        {(mode === "learning" || !hasManageAccess ? LEARNING_NAV : MANAGE_NAV).map((section, i) => {
          const visibleItems = section.items.filter(
            (item) =>
              (!item.requires || hasPermission(permissions, item.requires.resource, item.requires.action)) &&
              (!item.platformOnly || isPlatform),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.heading ?? `_top_${i}`} className="mb-1">
              {section.heading && (
                <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-text-tertiary">
                  {section.heading}
                </div>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </nav>
    </>
  );
}

/** The desktop rail — always visible from md upward, hidden below that so
 * it never competes with page content for width on a phone screen. See
 * `MobileSidebar` for the small-screen equivalent. */
export function Sidebar() {
  return (
    <aside className="hidden min-h-0 w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-surface-alt p-3 md:flex">
      <SidebarNav />
    </aside>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-text-primary text-canvas" : "text-text-tertiary hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-accent-soft font-semibold text-accent-soft-fg"
          : "text-text-secondary hover:bg-border/40 hover:text-text-primary",
      )}
    >
      <LayoutGrid className="size-3.5 shrink-0 opacity-60" aria-hidden />
      {label}
    </Link>
  );
}
