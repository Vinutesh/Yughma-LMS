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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const setMode = useUiStore((s) => s.setMode);
  const hasManageAccess = useHasManageAccess();
  const permissions = useSessionStore((s) => s.session?.permissions ?? []);
  const isPlatform = useSessionStore((s) => s.session?.org.isPlatform ?? false);

  /** The URL decides which nav shows — landing on a /manage link directly
   * must not leave the sidebar displaying Learning. The persisted uiStore mode
   * records the preference for where to land on login, not what to render. */
  const mode = pathname.startsWith("/manage") ? "manage" : "learning";

  function switchMode(next: "learning" | "manage") {
    setMode(next);
    router.push(next === "learning" ? "/home" : "/manage/dashboard");
  }

  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-surface-alt p-3">
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
                <NavLink key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} />
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/** A nav item stays highlighted on its own sub-routes, so the course builder
 * at /manage/courses/<id> still reads as "Courses". */
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

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-accent-soft font-semibold text-accent-soft-fg"
          : "text-text-secondary hover:bg-border/40 hover:text-text-primary",
      )}
    >
      <LayoutGrid className="size-3.5 opacity-60" aria-hidden />
      {label}
    </Link>
  );
}
