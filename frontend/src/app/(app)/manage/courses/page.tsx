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
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import type { CourseSummary } from "@/lib/api/resources/courses";
import { ApiError } from "@/lib/api/errors";
import type { CourseStatus } from "@/types/domain";

const STATUS_VARIANT: Record<CourseStatus, "success" | "neutral" | "warning"> = {
  published: "success",
  draft: "neutral",
  archived: "warning",
};

export default function ManageCoursesPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pendingArchive, setPendingArchive] = useState<CourseSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses", session?.org.id],
    queryFn: () => coursesApi.listCourses(),
    enabled: !!session,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["courses"] });

  const create = useMutation({
    mutationFn: () => coursesApi.createCourse(title),
    onSuccess: (course) => {
      setCreateOpen(false);
      setTitle("");
      invalidate();
      router.push(`/manage/courses/${course.id}`);
    },
  });

  const duplicate = useMutation({
    mutationFn: (courseId: string) => coursesApi.duplicateCourse(courseId),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (courseId: string) => coursesApi.archiveCourse(courseId),
    onSuccess: () => {
      setPendingArchive(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (courseId: string) => coursesApi.deleteCourse(courseId),
    onSuccess: invalidate,
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <AccessDenied title="Courses" />;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Courses</h1>
        <Button onClick={() => setCreateOpen(true)}>Create course</Button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading courses...</p>
      ) : courses.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No courses yet</p>
          <p className="text-xs text-text-tertiary">
            Create one, add a module and a lesson, then publish it.
          </p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Name</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Lessons</TableTh>
              <TableTh>Enrolled</TableTh>
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableTd>
                  <Link
                    href={`/manage/courses/${c.id}`}
                    className="font-medium text-text-primary hover:text-accent hover:underline"
                  >
                    {c.title}
                  </Link>
                </TableTd>
                <TableTd>
                  <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">
                    {c.status}
                  </Badge>
                </TableTd>
                <TableTd>{c.lessonCount}</TableTd>
                <TableTd>{c.enrolledCount || "—"}</TableTd>
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${c.title}`} />
                    <MenuContent>
                      <MenuItem onSelect={() => router.push(`/manage/courses/${c.id}`)}>
                        Edit
                      </MenuItem>
                      <MenuItem onSelect={() => duplicate.mutate(c.id)}>Duplicate</MenuItem>
                      {c.status !== "archived" && (
                        <MenuItem onSelect={() => setPendingArchive(c)}>Archive</MenuItem>
                      )}
                      <MenuSeparator />
                      <MenuItem
                        destructive
                        onSelect={() => {
                          setError(null);
                          remove.mutate(c.id);
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
            <DialogTitle>Create course</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-title">Title</Label>
            <Input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sales Fundamentals"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim()}
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingArchive} onOpenChange={(open) => !open && setPendingArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive &ldquo;{pendingArchive?.title}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            {pendingArchive?.enrolledCount
              ? `${pendingArchive.enrolledCount} ${pendingArchive.enrolledCount === 1 ? "person is" : "people are"} enrolled. They'll keep access to finish it — it just stops appearing for new enrollment.`
              : "It stops appearing in the catalog for new enrollment."}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              loading={archive.isPending}
              onClick={() => pendingArchive && archive.mutate(pendingArchive.id)}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
