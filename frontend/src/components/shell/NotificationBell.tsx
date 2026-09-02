"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useSessionStore } from "@/state/sessionStore";
import * as notificationsApi from "@/lib/api/resources/notifications";
import type { NotificationItem } from "@/types/domain";

export function NotificationBell() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const router = useRouter();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsApi.listNotifications(),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recent = notifications.slice(0, 5);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function openItem(n: NotificationItem) {
    if (!n.read) markRead.mutate(n.id);
    if (n.targetUrl) router.push(n.targetUrl);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-alt"
          aria-label="Notifications"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-lg border border-border bg-surface p-1.5 shadow-(--shadow-token-md)"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-xs font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="px-2.5 py-4 text-center text-xs text-text-tertiary">
              Nothing yet — you&apos;re all caught up.
            </p>
          ) : (
            recent.map((n) => (
              <DropdownMenu.Item
                key={n.id}
                onSelect={() => openItem(n)}
                className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2.5 py-2 text-sm outline-none hover:bg-surface-alt"
              >
                <span className={"flex items-start gap-1.5 " + (n.read ? "text-text-secondary" : "font-medium text-text-primary")}>
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />}
                  {n.title}
                </span>
                <span className="pl-3 text-[11px] text-text-tertiary">{relativeTime(n.createdAt)}</span>
              </DropdownMenu.Item>
            ))
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/notifications"
              className="block rounded-md px-2.5 py-2 text-center text-xs font-semibold text-accent outline-none hover:bg-surface-alt"
            >
              See all
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function relativeTime(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
