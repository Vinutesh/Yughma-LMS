"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as communitiesApi from "@/lib/api/resources/communities";
import type { ReportReason } from "@/types/domain";

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  off_topic: "Off-topic",
  other: "Other",
};

export default function ModerationQueuePage() {
  const canModerate = usePermission("courses", "edit");
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["moderationQueue", org?.id],
    queryFn: () => communitiesApi.listModerationQueue(),
    enabled: !!org && canModerate,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["moderationQueue"] });

  const remove = useMutation({
    mutationFn: (postId: string) => communitiesApi.removePost(postId),
    onSuccess: invalidate,
  });
  const dismiss = useMutation({
    mutationFn: (reportId: string) => communitiesApi.dismissReport(reportId),
    onSuccess: invalidate,
  });

  if (!canModerate) return <AccessDenied title="Moderation Queue" />;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Moderation Queue</h1>
      <p className="mb-5 text-sm text-text-tertiary">Reported posts awaiting review.</p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading queue...</p>
      ) : queue.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Nothing to review</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((row) => (
            <Card key={row.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <Badge variant="warning">{REASON_LABELS[row.reason]}</Badge>
                <span className="text-xs text-text-tertiary">
                  Reported by {row.reporterName} · in &quot;{row.threadTitle}&quot;
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-text-secondary">
                &quot;{row.postBody}&quot;
              </p>
              <div className="flex justify-end gap-2 border-t border-border pt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={dismiss.isPending}
                  onClick={() => dismiss.mutate(row.id)}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  loading={remove.isPending}
                  onClick={() => remove.mutate(row.postId)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
