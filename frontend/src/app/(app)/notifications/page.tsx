"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useSessionStore } from "@/state/sessionStore";
import * as notificationsApi from "@/lib/api/resources/notifications";
import type { NotificationCategory, NotificationItem } from "@/types/domain";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  grading: "Grading & Feedback",
  deadlines: "Deadlines",
  course_updates: "Course Updates",
  team_admin: "Team/Admin Activity",
  community: "Community",
};

export default function NotificationCenterPage() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const router = useRouter();
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [tab, setTab] = useState<"all" | "unread">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsApi.listNotifications(),
    enabled: !!userId,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filtered = notifications
    .filter((n) => category === "all" || n.category === category)
    .filter((n) => tab === "all" || !n.read);

  function openItem(n: NotificationItem) {
    if (!n.read) markRead.mutate(n.id);
    if (n.targetUrl) router.push(n.targetUrl);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <Button size="sm" variant="secondary" onClick={() => markAllRead.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="mb-4 mt-3 flex items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value as NotificationCategory | "all")}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading notifications...</p>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Nothing here</p>
          <p className="text-xs text-text-tertiary">You&apos;re all caught up.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-surface-alt"
            >
              <span
                className={
                  "mt-1.5 size-1.5 shrink-0 rounded-full " + (n.read ? "bg-transparent" : "bg-accent")
                }
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span
                  className={
                    "block text-sm " + (n.read ? "text-text-secondary" : "font-medium text-text-primary")
                  }
                >
                  {n.title}
                </span>
                <span className="text-xs text-text-tertiary">
                  {CATEGORY_LABELS[n.category]} · {relativeTime(n.createdAt)}
                </span>
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

function relativeTime(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
