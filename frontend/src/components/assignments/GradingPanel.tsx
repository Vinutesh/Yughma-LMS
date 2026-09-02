"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { useSessionStore } from "@/state/sessionStore";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import type { AssignmentSummary, SubmissionWithLearner } from "@/lib/api/resources/assignments";
import { ApiError } from "@/lib/api/errors";

export function GradingPanel({
  assignment,
  submission,
  onClose,
}: {
  assignment: AssignmentSummary;
  submission: SubmissionWithLearner | null;
  onClose: () => void;
}) {
  const session = useSessionStore((s) => s.session)!;
  const qc = useQueryClient();
  const [score, setScore] = useState(
    submission?.score !== undefined ? String(submission.score) : "",
  );
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["submissions", assignment.id] });
    qc.invalidateQueries({ queryKey: ["assignment", assignment.id] });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  };

  const grade = useMutation({
    mutationFn: () =>
      assignmentsApi.gradeSubmission({
        submissionId: submission!.id,
        score: Number(score),
        feedback,
      }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  const toggleFlag = useMutation({
    mutationFn: () => assignmentsApi.setSubmissionFlag(submission!.id, !submission!.flagged),
    onSuccess: invalidate,
  });

  if (!submission) return null;

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent aria-describedby={undefined} className="max-w-md">
        <DrawerTitle>{submission.learnerName}</DrawerTitle>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            Submitted{" "}
            {new Date(submission.submittedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          {submission.late && <Badge variant="danger">Late</Badge>}
          {submission.flagged && <Badge variant="warning">Flagged</Badge>}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Instructions
          </p>
          <p className="text-xs leading-relaxed text-text-tertiary">{assignment.instructions}</p>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Submission
          </p>
          {submission.text ? (
            <p className="whitespace-pre-wrap rounded-md bg-surface-alt p-3 text-sm leading-relaxed text-text-secondary">
              {submission.text}
            </p>
          ) : (
            <p className="text-xs text-text-tertiary">No written response.</p>
          )}
          {submission.assetId && (
            <p className="mt-2 text-xs text-text-tertiary">A file was attached.</p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          {error && (
            <p className="rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-score">Score (out of {assignment.pointsPossible})</Label>
            <Input
              id="g-score"
              type="number"
              min={0}
              max={assignment.pointsPossible}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="max-w-28"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-feedback">Feedback</Label>
            <textarea
              id="g-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={() => toggleFlag.mutate()}>
              <Flag className="size-3.5" />
              {submission.flagged ? "Unflag" : "Flag for later"}
            </Button>
            <Button size="sm" disabled={score === ""} loading={grade.isPending} onClick={() => grade.mutate()}>
              Save grade
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
