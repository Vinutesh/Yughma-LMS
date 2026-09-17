"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/patterns/EmptyState";
import { SearchInput } from "@/components/patterns/SearchInput";
import { useSessionStore } from "@/state/sessionStore";
import * as assignmentsApi from "@/lib/api/resources/assignments";

export default function LearnerAssignmentsPage() {
  const session = useSessionStore((s) => s.session);
  const [search, setSearch] = useState("");

  const { data: allAssignments = [], isLoading } = useQuery({
    queryKey: ["myAssignments", session?.org.id, session?.user.id],
    queryFn: () => assignmentsApi.listMyAssignments(),
    enabled: !!session,
  });

  const assignments = useMemo(
    () => allAssignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase())),
    [allAssignments, search],
  );

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Assignments</h1>
      <p className="mb-4 text-sm text-text-tertiary">
        Work due across every course you&apos;re enrolled in.
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search assignments..."
        aria-label="Search assignments"
        className="mb-4"
      />

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading assignments...</p>
      ) : allAssignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing due"
          description="Assignments appear here once you're enrolled in a course that has them."
        />
      ) : assignments.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {assignments.map((a) => {
            const graded = a.submission?.score !== undefined;
            const submitted = !!a.submission;
            const overdue = !submitted && !!a.dueAt && new Date(a.dueAt) < new Date();
            return (
              <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/assignments/${a.id}`}
                    className="text-sm font-semibold text-text-primary hover:text-accent hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-text-tertiary">
                    {a.courseTitle}
                    {a.dueAt &&
                      ` · due ${new Date(a.dueAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}`}
                  </p>
                </div>
                {graded ? (
                  <Badge variant="success">
                    {a.submission!.score}/{a.pointsPossible}
                  </Badge>
                ) : submitted ? (
                  <Badge variant="accent">Submitted</Badge>
                ) : overdue ? (
                  <Badge variant="danger">Overdue</Badge>
                ) : (
                  <Badge variant="neutral">Not started</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
