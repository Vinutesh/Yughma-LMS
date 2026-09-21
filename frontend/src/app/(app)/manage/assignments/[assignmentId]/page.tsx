"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import * as assignmentsApi from "@/lib/api/resources/assignments";
import { GradingPanel } from "@/components/assignments/GradingPanel";

export default function SubmissionQueuePage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  // Same resource the backend actually checks — see the list page's own
  // comment on this.
  const canEdit = usePermission("courses", "edit");
  const [gradingId, setGradingId] = useState<string | null>(null);

  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => assignmentsApi.getAssignment(assignmentId),
    enabled: canEdit,
  });
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", assignmentId],
    queryFn: () => assignmentsApi.listSubmissions(assignmentId),
    enabled: canEdit,
  });

  const ungraded = useMemo(() => submissions.filter((s) => s.passed === undefined), [submissions]);
  const graded = useMemo(() => submissions.filter((s) => s.passed !== undefined), [submissions]);
  const grading = submissions.find((s) => s.id === gradingId) ?? null;

  if (!canEdit) return <AccessDenied title="Submissions" />;
  if (!assignment) return <p className="p-8 text-sm text-text-tertiary">Loading assignment...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link
        href="/manage/assignments"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Assignments
      </Link>
      <h1 className="text-xl font-semibold text-text-primary">{assignment.title}</h1>
      <p className="mb-4 mt-1 text-xs text-text-tertiary">
        {assignment.courseTitle} · {assignment.pointsPossible} pts
        {assignment.dueAt &&
          ` · due ${new Date(assignment.dueAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}`}
      </p>

      <Tabs defaultValue="ungraded">
        <TabsList>
          <TabsTrigger value="ungraded">Pending ({ungraded.length})</TabsTrigger>
          <TabsTrigger value="graded">Decided ({graded.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ungraded">
          <SubmissionList
            submissions={ungraded}
            isLoading={isLoading}
            emptyLabel="Nothing pending."
            onOpen={setGradingId}
          />
        </TabsContent>
        <TabsContent value="graded">
          <SubmissionList
            submissions={graded}
            isLoading={isLoading}
            emptyLabel="No decided submissions yet."
            onOpen={setGradingId}
          />
        </TabsContent>
      </Tabs>

      {/* Keyed so score/feedback re-initialize per submission rather than
          carrying the previous learner's entries over. */}
      <GradingPanel
        key={grading?.id ?? "none"}
        assignment={assignment}
        submission={grading}
        onClose={() => setGradingId(null)}
      />
    </div>
  );
}

function SubmissionList({
  submissions,
  isLoading,
  emptyLabel,
  onOpen,
}: {
  submissions: assignmentsApi.SubmissionWithLearner[];
  isLoading: boolean;
  emptyLabel: string;
  onOpen: (id: string) => void;
}) {
  if (isLoading) return <p className="text-sm text-text-tertiary">Loading submissions...</p>;
  if (submissions.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-1 p-8 text-center">
        <p className="text-sm text-text-tertiary">{emptyLabel}</p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      {submissions.map((s) => (
        <button
          key={s.id}
          onClick={() => onOpen(s.id)}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
        >
          {s.flagged && <Flag className="size-3.5 shrink-0 text-warning" aria-label="Flagged" />}
          <span className="flex-1 text-sm font-medium text-text-primary">{s.learnerName}</span>
          <span className="text-xs text-text-tertiary">
            Submitted{" "}
            {new Date(s.submittedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          {s.late && <Badge variant="danger">Late</Badge>}
          {s.passed !== undefined && (
            <Badge variant={s.passed ? "success" : "danger"}>{s.passed ? "Passed" : "Failed"}</Badge>
          )}
        </button>
      ))}
    </Card>
  );
}
