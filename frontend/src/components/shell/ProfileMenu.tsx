"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { Bell, KeyRound, LogOut, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, initialsFromName } from "@/components/ui/Avatar";
import { useSessionStore } from "@/state/sessionStore";
import { useTheme } from "@/hooks/useTheme";

export function ProfileMenu() {
  const router = useRouter();
  const user = useSessionStore((s) => s.session?.user);
  const logout = useSessionStore((s) => s.logout);
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Profile menu"
        >
          <Avatar>
            <AvatarFallback>{initialsFromName(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-lg border border-border bg-surface p-1.5 shadow-(--shadow-token-md)"
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-semibold text-text-primary">{user.name}</p>
            <p className="text-xs text-text-tertiary">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={toggleTheme}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-secondary outline-none hover:bg-surface-alt hover:text-text-primary"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => router.push("/settings/notifications")}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-secondary outline-none hover:bg-surface-alt hover:text-text-primary"
          >
            <Bell className="size-4" />
            Notification preferences
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => router.push("/settings/password")}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-secondary outline-none hover:bg-surface-alt hover:text-text-primary"
          >
            <KeyRound className="size-4" />
            Change password
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={async () => {
              await logout();
              router.push("/login");
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-danger outline-none hover:bg-danger-bg"
          >
            <LogOut className="size-4" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
