"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import * as communitiesApi from "@/lib/api/resources/communities";
import type { ReportReason } from "@/types/domain";

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  off_topic: "Off-topic",
  other: "Other",
};

export function ThreadDetailScreen({
  threadId,
  onBack,
  backLabel,
}: {
  threadId: string;
  onBack: () => void;
  backLabel: string;
}) {
  const session = useSessionStore((s) => s.session);
  const canModerate = usePermission("courses", "edit");
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [reportPostId, setReportPostId] = useState<string | null>(null);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread", threadId, session?.user.id],
    queryFn: () => communitiesApi.getThread(threadId),
    enabled: !!session,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["thread", threadId] });
    qc.invalidateQueries({ queryKey: ["courseThreads"] });
    qc.invalidateQueries({ queryKey: ["orgThreads"] });
  };

  const sendReply = useMutation({
    mutationFn: () => communitiesApi.replyToThread({ threadId, body: reply }),
    onSuccess: () => {
      setReply("");
      invalidate();
    },
  });

  const togglePin = useMutation({
    mutationFn: () => communitiesApi.pinThread(threadId, !thread!.pinned),
    onSuccess: invalidate,
  });
  const toggleLock = useMutation({
    mutationFn: () => communitiesApi.lockThread(threadId, !thread!.locked),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => communitiesApi.removeThread(threadId),
    onSuccess: onBack,
  });
  const removePost = useMutation({
    mutationFn: (postId: string) => communitiesApi.removePost(postId),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading thread...</p>;
  if (!thread) return <p className="p-8 text-sm text-text-tertiary">Thread not found.</p>;

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm font-medium text-accent hover:underline">
        ← {backLabel}
      </button>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {thread.pinned && <span aria-hidden>📌</span>}
          <h1 className="text-lg font-semibold text-text-primary">{thread.title}</h1>
          {thread.locked && <Badge variant="neutral">Locked</Badge>}
        </div>
        {canModerate && (
          <Menu>
            <MenuTrigger label="Thread actions" />
            <MenuContent>
              <MenuItem onSelect={() => togglePin.mutate()}>
                {thread.pinned ? "Unpin thread" : "Pin thread"}
              </MenuItem>
              <MenuItem onSelect={() => toggleLock.mutate()}>
                {thread.locked ? "Unlock thread" : "Lock thread"}
              </MenuItem>
              <MenuItem destructive onSelect={() => remove.mutate()}>
                Remove
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {thread.posts.map((post) => (
          <Card key={post.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-text-primary">
                {post.authorName}{" "}
                <span className="font-normal text-text-tertiary">
                  · {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </p>
              <Menu>
                <MenuTrigger label={`Actions for ${post.authorName}'s post`} />
                <MenuContent>
                  <MenuItem onSelect={() => setReportPostId(post.id)}>Report</MenuItem>
                  {canModerate && (
                    <MenuItem destructive onSelect={() => removePost.mutate(post.id)}>
                      Remove
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            </div>
            <p className="whitespace-pre-wrap text-sm text-text-secondary">{post.body}</p>
          </Card>
        ))}
      </div>

      {thread.locked ? (
        <p className="mt-4 text-sm text-text-tertiary">This thread is locked — no new replies.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!reply.trim()}
              loading={sendReply.isPending}
              onClick={() => sendReply.mutate()}
            >
              Reply
            </Button>
          </div>
        </div>
      )}

      <ReportDialog
        open={!!reportPostId}
        onOpenChange={(o) => !o && setReportPostId(null)}
        onReport={(reason) => {
          if (!reportPostId || !session) return;
          communitiesApi.reportPost({ postId: reportPostId, reason }).then(() => setReportPostId(null));
        }}
      />
    </div>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  onReport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReport: (reason: ReportReason) => void;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this post</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(Object.keys(REASON_LABELS) as ReportReason[]).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="report-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-accent"
              />
              {REASON_LABELS[r]}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onReport(reason)}>Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
