"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { useSessionStore } from "@/state/sessionStore";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import type { AssignmentSummary } from "@/lib/api/resources/assignments";
import * as contentApi from "@/lib/api/resources/content";
import { ApiError } from "@/lib/api/errors";
import type { AssetKind, Submission } from "@/types/domain";

export default function AssignmentSubmitPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const session = useSessionStore((s) => s.session);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId, session?.user.id],
    queryFn: () => assignmentsApi.getAssignment(assignmentId, true),
    enabled: !!session,
  });
  const { data: submission, isLoading: loadingSubmission } = useQuery({
    queryKey: ["mySubmission", assignmentId, session?.user.id],
    queryFn: () => assignmentsApi.getMySubmission(assignmentId),
    enabled: !!session,
  });
  const { data: assignmentFile } = useQuery({
    queryKey: ["assignmentAsset", assignmentId],
    queryFn: () => assignmentsApi.getAssignmentAssetUrl(assignmentId),
    enabled: !!session && !!assignment?.assetId,
  });

  if (isLoading || loadingSubmission) {
    return <p className="p-8 text-sm text-text-tertiary">Loading assignment...</p>;
  }
  if (!assignment) return <p className="p-8 text-sm text-text-tertiary">Assignment not found.</p>;

  // Keyed on the loaded submission so the response fields initialize from it
  // once, instead of being synced by an effect on every refetch.
  return (
    <AssignmentBody
      key={submission?.id ?? "new"}
      assignment={assignment}
      submission={submission ?? null}
      assignmentFile={assignmentFile ?? null}
    />
  );
}

function AssignmentBody({
  assignment,
  submission,
  assignmentFile,
}: {
  assignment: AssignmentSummary;
  submission: Submission | null;
  assignmentFile: { name: string; kind: AssetKind; url?: string } | null;
}) {
  const session = useSessionStore((s) => s.session)!;
  const qc = useQueryClient();

  const [text, setText] = useState(submission?.text ?? "");
  const [assetId, setAssetId] = useState(submission?.assetId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Captured once — the "in N days" hint doesn't need to tick live.
  const [now] = useState(() => Date.now());

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", session.org.id],
    queryFn: () => contentApi.listAssets(),
  });

  const submit = useMutation({
    mutationFn: () =>
      assignmentsApi.submitAssignment({
        assignmentId: assignment.id,
        text: text || undefined,
        assetId,
      }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["mySubmission", assignment.id] });
      qc.invalidateQueries({ queryKey: ["myAssignments"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  const graded = submission?.score !== undefined;
  const wantsText = assignment.submissionType !== "file";
  const wantsFile = assignment.submissionType !== "text";
  const attached = assets.find((a) => a.id === assetId);
  const isScorm = assignmentFile?.kind === "scorm";

  const dueLabel = assignment.dueAt
    ? new Date(assignment.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const daysLeft = assignment.dueAt
    ? Math.ceil((new Date(assignment.dueAt).getTime() - now) / 86400000)
    : null;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/assignments"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Assignments
      </Link>

      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-text-primary">{assignment.title}</h1>
        {graded ? (
          <Badge variant="success">
            Graded: {submission!.score}/{assignment.pointsPossible}
          </Badge>
        ) : (
          dueLabel && (
            <span className="shrink-0 text-xs text-text-tertiary">
              Due {dueLabel}
              {daysLeft !== null &&
                daysLeft >= 0 &&
                ` (in ${daysLeft} ${daysLeft === 1 ? "day" : "days"})`}
            </span>
          )
        )}
      </div>
      <p className="mb-4 text-xs text-text-tertiary">
        {assignment.courseTitle} · {assignment.pointsPossible} pts
      </p>

      <p className="whitespace-pre-wrap border-t border-border pt-4 text-sm leading-relaxed text-text-secondary">
        {assignment.instructions}
      </p>

      {assignment.assetId && !isScorm && (
        <div className="mb-5 mt-3 flex items-center justify-between rounded-md border border-border px-3 py-2">
          <span className="text-sm text-text-secondary">{assignmentFile?.name ?? "Assignment file"}</span>
          {assignmentFile?.url ? (
            <a href={assignmentFile.url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                <Download className="mr-1.5 size-3.5" aria-hidden />
                Download
              </Button>
            </a>
          ) : (
            <span className="text-xs text-text-tertiary">Not downloadable yet</span>
          )}
        </div>
      )}
      {(!assignment.assetId || isScorm) && <div className="mb-5" />}

      {isScorm ? (
        // A SCORM assignment is completed in-app, not downloaded and
        // submitted separately — the package itself reports its own
        // completion and (when it has one) score straight to
        // `settleAssignmentGrade`, the same qualifying-assignment/
        // certificate path a human-entered grade goes through. There's
        // nothing here for the learner to type or attach.
        <ScormPlayer
          target={{ assignmentId: assignment.id }}
          title={assignment.title}
          onComplete={() => {
            qc.invalidateQueries({ queryKey: ["mySubmission", assignment.id] });
            qc.invalidateQueries({ queryKey: ["myAssignments"] });
          }}
        />
      ) : graded ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Your response (submitted{" "}
              {new Date(submission!.submittedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              )
            </p>
            <Card className="whitespace-pre-wrap p-3 text-sm leading-relaxed text-text-secondary">
              {submission!.text || "No written response."}
            </Card>
          </div>
          {submission!.feedback && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Feedback
              </p>
              <Card className="whitespace-pre-wrap p-3 text-sm leading-relaxed text-text-secondary">
                {submission!.feedback}
              </Card>
            </div>
          )}
        </div>
      ) : (
        <Card className="flex flex-col gap-4 p-5">
          {error && (
            <p className="rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
          )}

          {wantsText && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-text">Your response</Label>
              <textarea
                id="s-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="rounded-md border border-border bg-surface p-3 text-sm leading-relaxed text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              />
            </div>
          )}

          {wantsFile && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Attach file{assignment.submissionType === "both" ? " (optional)" : ""}
              </Label>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm text-text-secondary">
                  {attached ? attached.name : "Nothing attached"}
                </span>
                <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                  {attached ? "Change" : "Choose"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button loading={submit.isPending} onClick={() => submit.mutate()}>
              {submission ? "Resubmit" : "Submit"}
            </Button>
            {submission && !submit.isPending && (
              <span className="text-xs text-text-tertiary">
                Submitted{" "}
                {new Date(submission.submittedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                — not graded yet
              </span>
            )}
          </div>
        </Card>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Attach a file</DialogTitle>
          </DialogHeader>
          <ContentLibrary
            mode="picker"
            onUseSelected={(asset) => {
              setAssetId(asset.id);
              setPickerOpen(false);
            }}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
