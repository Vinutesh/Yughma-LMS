"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as quizzesApi from "@/lib/api/resources/quizzes";
import * as coursesApi from "@/lib/api/resources/courses";
import { ApiError } from "@/lib/api/errors";
import { KIND_COPY } from "@/components/quizzes/kind";
import type { QuizKind } from "@/types/domain";

export function QuizListScreen({ kind }: { kind: QuizKind }) {
  const copy = KIND_COPY[kind];
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes", session?.org.id, kind],
    queryFn: () => quizzesApi.listQuizzes(kind),
    enabled: !!session && canEdit,
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["courses", session?.org.id],
    queryFn: () => coursesApi.listCourses(),
    enabled: !!session && canEdit,
  });

  const create = useMutation({
    mutationFn: () =>
      quizzesApi.createQuiz({
        courseId,
        title,
        kind,
      }),
    onSuccess: (quiz) => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      setCreateOpen(false);
      setTitle("");
      router.push(`${copy.manageBasePath}/${quiz.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => quizzesApi.deleteQuiz(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <ComingSoon title={copy.plural} />;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{copy.plural}</h1>
        <Button onClick={() => setCreateOpen(true)}>Create {copy.singular.toLowerCase()}</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        {kind === "assessment"
          ? "High-stakes: one attempt, a passing score, and an optional window. Passing can award a certificate."
          : "Low-stakes knowledge checks attached to a course. Retakes allowed."}
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading {copy.plural.toLowerCase()}...</p>
      ) : quizzes.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            No {copy.plural.toLowerCase()} yet
          </p>
          <p className="text-xs text-text-tertiary">
            Create one against a course, then add questions to it.
          </p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Name</TableTh>
              <TableTh>Course</TableTh>
              <TableTh>Questions</TableTh>
              {kind === "assessment" ? <TableTh>Pass mark</TableTh> : <TableTh>Points</TableTh>}
              <TableTh>Attempts</TableTh>
              {kind === "assessment" && <TableTh>Window</TableTh>}
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {quizzes.map((q) => (
              <TableRow key={q.id}>
                <TableTd>
                  <Link
                    href={`${copy.manageBasePath}/${q.id}`}
                    className="font-medium text-text-primary hover:text-accent hover:underline"
                  >
                    {q.title}
                  </Link>
                </TableTd>
                <TableTd className="text-xs">{q.courseTitle}</TableTd>
                <TableTd>{q.questionCount}</TableTd>
                <TableTd>
                  {kind === "assessment" ? `${q.passingScorePercent ?? 0}%` : q.totalPoints}
                </TableTd>
                <TableTd>{q.attemptCount || "—"}</TableTd>
                {kind === "assessment" && (
                  <TableTd>
                    <WindowBadge quiz={q} />
                  </TableTd>
                )}
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${q.title}`} />
                    <MenuContent>
                      <MenuItem onSelect={() => router.push(`${copy.manageBasePath}/${q.id}`)}>
                        Edit
                      </MenuItem>
                      <MenuItem
                        destructive
                        onSelect={() => {
                          setError(null);
                          remove.mutate(q.id);
                        }}
                      >
                        Delete
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {copy.singular.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-title">Name</Label>
              <Input id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-course">Course</Label>
              <select
                id="q-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || !courseId}
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WindowBadge({ quiz }: { quiz: quizzesApi.QuizSummary }) {
  if (!quiz.availableFrom && !quiz.availableTo) {
    return <span className="text-xs text-text-tertiary">Always open</span>;
  }
  const state = quizzesApi.availabilityOf(quiz);
  if (state === "not_yet") return <Badge variant="neutral">Opens soon</Badge>;
  if (state === "closed") return <Badge variant="danger">Closed</Badge>;
  return <Badge variant="success">Open</Badge>;
}
