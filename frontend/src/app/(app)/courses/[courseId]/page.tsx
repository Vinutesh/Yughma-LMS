"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, CircleDot } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSessionStore } from "@/state/sessionStore";
import { usePermission } from "@/hooks/usePermission";
import * as coursesApi from "@/lib/api/resources/courses";

/**
 * There is no more self-enrollment — a learner only ever reaches this page
 * for a course they've already been granted access to (the backend 404s
 * `courses.get` otherwise; see `courses.ts` router). `course.enrollment`
 * being null here means the viewer is a platform-org author/admin
 * previewing their own course, not an unenrolled learner deciding whether
 * to join.
 */
export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const session = useSessionStore((s) => s.session);
  const canModerate = usePermission("courses", "edit");
  const router = useRouter();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId, session?.user.id],
    queryFn: () => coursesApi.getCourse(courseId, true),
    enabled: !!session,
  });

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading course...</p>;
  if (!course) return <p className="p-8 text-sm text-text-tertiary">Course not found.</p>;

  const enrollment = course.enrollment;
  const active = !!enrollment;
  const done = new Set(enrollment?.completedLessonIds ?? []);
  const allLessons = course.outline.flatMap((m) => m.lessons);
  const nextLesson = allLessons.find((l) => !done.has(l.id));

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/courses"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Courses
      </Link>

      <h1 className="text-xl font-semibold text-text-primary">{course.title}</h1>
      <p className="mt-1 text-xs text-text-tertiary">
        by {course.authorName} · {course.moduleCount}{" "}
        {course.moduleCount === 1 ? "module" : "modules"}
        {course.estimatedMinutes > 0 && ` · ~${Math.round(course.estimatedMinutes / 60)} hrs`}
      </p>
      {course.description && (
        <p className="mt-3 text-sm text-text-secondary">{course.description}</p>
      )}

      {!active && canModerate && (
        <p className="mt-4 rounded-md bg-accent-soft p-2.5 text-xs font-medium text-accent-soft-fg">
          Previewing — you don&apos;t have an access grant for this course.
        </p>
      )}

      {course.prerequisites.length > 0 && (
        <p className="mt-4 text-xs text-text-tertiary">
          Requires: {course.prerequisites.map((p) => p.title).join(", ")}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {course.outline.length === 0 && (
          <p className="text-sm text-text-tertiary">No lessons published yet.</p>
        )}
        {course.outline.map((mod, mi) => {
          const moduleDone = mod.lessons.length > 0 && mod.lessons.every((l) => done.has(l.id));
          const moduleStarted = mod.lessons.some((l) => done.has(l.id));
          return (
            <div key={mod.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">
                  Module {mi + 1}: {mod.title}
                </p>
                {active && moduleDone && <Badge variant="success">Done</Badge>}
                {active && !moduleDone && moduleStarted && (
                  <Badge variant="accent">In progress</Badge>
                )}
              </div>
              <Card className="divide-y divide-border">
                {mod.lessons.length === 0 ? (
                  <p className="p-3 text-xs text-text-tertiary">No lessons in this module yet.</p>
                ) : (
                  mod.lessons.map((lesson) => {
                    const complete = done.has(lesson.id);
                    return (
                      <div key={lesson.id} className="flex items-center gap-2.5 px-3 py-2.5">
                        {active ? (
                          complete ? (
                            <Check className="size-4 shrink-0 text-success" />
                          ) : lesson.id === nextLesson?.id ? (
                            <CircleDot className="size-4 shrink-0 text-accent" />
                          ) : (
                            <Circle className="size-4 shrink-0 text-text-tertiary" />
                          )
                        ) : (
                          <Circle className="size-4 shrink-0 text-text-tertiary" />
                        )}
                        {active ? (
                          <Link
                            href={`/courses/${courseId}/lessons/${lesson.id}`}
                            className="flex-1 truncate text-sm text-text-secondary hover:text-accent hover:underline"
                          >
                            {lesson.title}
                          </Link>
                        ) : (
                          <span className="flex-1 truncate text-sm text-text-secondary">
                            {lesson.title}
                          </span>
                        )}
                        {lesson.estimatedMinutes && (
                          <span className="text-[11px] tabular-nums text-text-tertiary">
                            {lesson.estimatedMinutes} min
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        {active || canModerate ? (
          <Link
            href={`/courses/${courseId}/community`}
            className="text-sm font-medium text-accent hover:underline"
          >
            💬 Discussion
          </Link>
        ) : (
          <span />
        )}
        {active &&
          (nextLesson ? (
            <Button onClick={() => router.push(`/courses/${courseId}/lessons/${nextLesson.id}`)}>
              Continue →
            </Button>
          ) : (
            <Badge variant="success">Course complete</Badge>
          ))}
      </div>
    </div>
  );
}
