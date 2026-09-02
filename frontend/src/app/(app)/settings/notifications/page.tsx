"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { useSessionStore } from "@/state/sessionStore";
import * as notificationsApi from "@/lib/api/resources/notifications";
import type { NotificationCategory } from "@/types/domain";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  grading: "Grading & Feedback",
  deadlines: "Deadlines",
  course_updates: "Course Updates",
  team_admin: "Team/Admin Activity",
  community: "Community",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as NotificationCategory[];

/**
 * Personal notification preferences — distinct from org-level Settings
 * (`/manage/settings`). Every account has one of these regardless of role,
 * so it lives under the account, reachable from the profile menu.
 */
export default function NotificationPreferencesPage() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notificationPreferences", userId],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: !!userId,
  });

  const toggle = useMutation({
    mutationFn: (vars: { category: NotificationCategory; channel: "inApp" | "email"; value: boolean }) =>
      notificationsApi.updatePreferences(vars.category, vars.channel, vars.value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificationPreferences"] }),
  });

  if (isLoading || !prefs) {
    return <p className="p-8 text-sm text-text-tertiary">Loading preferences...</p>;
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Notification Preferences</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Choose what you hear about and how. In-app notifications always show in the bell menu.
      </p>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 border-b border-border bg-surface-alt px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          <span />
          <span className="text-center">In-app</span>
          <span className="text-center">Email</span>
        </div>
        {CATEGORIES.map((category) => (
          <div
            key={category}
            className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-b-0"
          >
            <span className="text-text-primary">{CATEGORY_LABELS[category]}</span>
            {(["inApp", "email"] as const).map((channel) => (
              <span key={channel} className="flex justify-center">
                <input
                  type="checkbox"
                  aria-label={`${CATEGORY_LABELS[category]} — ${channel === "inApp" ? "in-app" : "email"}`}
                  checked={prefs.categories[category][channel]}
                  onChange={(e) => toggle.mutate({ category, channel, value: e.target.checked })}
                  className="size-4 accent-accent"
                />
              </span>
            ))}
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-text-primary">Account security</span>
          <span className="text-xs font-medium text-text-tertiary">Always on</span>
        </div>
      </Card>
    </div>
  );
}
