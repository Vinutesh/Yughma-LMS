"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import * as communitiesApi from "@/lib/api/resources/communities";
import { ApiError } from "@/lib/api/errors";

export function ThreadListScreen({
  scope,
  courseId,
  basePath,
}: {
  scope: "course" | "org";
  /** Set for scope "course". */
  courseId?: string;
  /** Where thread links point — `/community` or `/courses/:id/community`. */
  basePath: string;
}) {
  const session = useSessionStore((s) => s.session);
  const canModerate = usePermission("courses", "edit");
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: threads = [], isLoading } = useQuery({
    queryKey:
      scope === "course"
        ? ["courseThreads", courseId, session?.user.id]
        : ["orgThreads", session?.org.id],
    queryFn: () =>
      scope === "course" ? communitiesApi.listCourseThreads(courseId!) : communitiesApi.listOrgThreads(),
    enabled: scope === "course" ? !!courseId && !!session : !!session,
  });

  const [createError, setCreateError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (input: { title: string; body: string }) =>
      communitiesApi.createThread({
        scope,
        courseId,
        title: input.title,
        body: input.body,
      }),
    onSuccess: () => {
      setCreateError(null);
      qc.invalidateQueries({ queryKey: scope === "course" ? ["courseThreads"] : ["orgThreads"] });
      setCreateOpen(false);
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New thread
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading discussion...</p>
      ) : threads.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No threads yet</p>
          <p className="text-xs text-text-tertiary">Start the first one.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`${basePath}/${t.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-alt"
            >
              <span className="flex min-w-0 items-center gap-2">
                {t.pinned && <span aria-hidden>📌</span>}
                {t.locked && <span aria-hidden>🔒</span>}
                <span className="truncate text-sm font-medium text-text-primary">{t.title}</span>
              </span>
              <Badge variant="neutral">
                {t.postCount} {t.postCount === 1 ? "reply" : "replies"}
              </Badge>
            </Link>
          ))}
        </Card>
      )}

      <CreateThreadDialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) setCreateError(null);
          setCreateOpen(o);
        }}
        onCreate={(title, body) => create.mutate({ title, body })}
        pending={create.isPending}
        error={createError}
      />
    </div>
  );
}

function CreateThreadDialog({
  open,
  onOpenChange,
  onCreate,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (title: string, body: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setTitle("");
          setBody("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thread-title">Title</Label>
            <Input id="thread-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thread-body">First post</Label>
            <textarea
              id="thread-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !body.trim()}
            loading={pending}
            onClick={() => onCreate(title, body)}
          >
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
