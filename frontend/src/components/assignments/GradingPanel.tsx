"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/Drawer";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import type { AssignmentSummary, SubmissionWithLearner } from "@/lib/api/resources/assignments";

/**
 * A read-only submission viewer — there is deliberately no score/feedback
 * form here anymore. Scoring comes from the assessment package itself
 * (see `assignments.ts` router's own comment on why the manual `grade`
 * mutation was removed), so this is just for oversight: see what someone
 * submitted, flag one for follow-up, or delete it outright.
 */
export function GradingPanel({
  assignment,
  submission,
  onClose,
}: {
  assignment: AssignmentSummary;
  submission: SubmissionWithLearner | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["submissions", assignment.id] });
    qc.invalidateQueries({ queryKey: ["assignment", assignment.id] });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  };

  const toggleFlag = useMutation({
    mutationFn: () => assignmentsApi.setSubmissionFlag(submission!.id, !submission!.flagged),
    onSuccess: invalidate,
  });

  const deleteSubmission = useMutation({
    mutationFn: () => assignmentsApi.deleteSubmission(submission!.id),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(false);
      onClose();
    },
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

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Score
          </p>
          {submission.score !== undefined ? (
            <p className="text-sm text-text-secondary">
              {submission.score}/{assignment.pointsPossible} — graded automatically by the
              assessment itself.
            </p>
          ) : (
            <p className="text-xs text-text-tertiary">
              Not scored yet — this comes from the assessment once it&apos;s completed, not from a
              manual review.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <Button size="sm" variant="ghost" onClick={() => toggleFlag.mutate()}>
            <Flag className="size-3.5" />
            {submission.flagged ? "Unflag" : "Flag for later"}
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </DrawerContent>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {submission.learnerName}&apos;s submission?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            This permanently removes their submitted response and score. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={deleteSubmission.isPending} onClick={() => deleteSubmission.mutate()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
