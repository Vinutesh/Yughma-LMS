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
import * as assignmentsApi from "@/lib/api/resources/assignments";
import { isAssignmentPassed } from "@/lib/api/resources/assignments";
import { gradientForSeed } from "@/lib/utils";

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
  // Only needed once every lesson is done, but cheap enough (one shared
  // query, already used by the Assignments page) to just always fetch —
  // simpler than gating it behind lesson-completion state.
  const { data: myAssignments = [] } = useQuery({
    queryKey: ["myAssignments", session?.user.id],
    queryFn: () => assignmentsApi.listMyAssignments(),
    enabled: !!session,
  });

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading course...</p>;
  if (!course) return <p className="p-8 text-sm text-text-tertiary">Course not found.</p>;

  const enrollment = course.enrollment;
  const active = !!enrollment;
  const done = new Set(enrollment?.completedLessonIds ?? []);
  const allLessons = course.outline.flatMap((m) => m.lessons);
  const nextLesson = allLessons.find((l) => !done.has(l.id));
  const progressPercent = allLessons.length === 0 ? 0 : Math.round((done.size / allLessons.length) * 100);

  // The one assignment (if any) that has to be passed before this course's
  // certificate can issue — see `courses.ts`'s `qualifyingAssignmentPassed`
  // on the backend, which this mirrors for display purposes only; the
  // actual gate is enforced server-side regardless of what this page shows.
  const qualifyingAssignment = myAssignments.find((a) => a.courseId === courseId && a.isQualifying);
  const needsAssessment = !!qualifyingAssignment && !isAssignmentPassed(qualifyingAssignment);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/courses"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Courses
      </Link>

      <div
        className="relative overflow-hidden rounded-xl p-6 text-white"
        style={{ backgroundImage: gradientForSeed(course.id) }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />
        <h1 className="relative font-display text-2xl font-bold text-balance">{course.title}</h1>
        <p className="relative mt-1.5 text-sm text-white/75">
          by {course.authorName} · {course.moduleCount}{" "}
          {course.moduleCount === 1 ? "module" : "modules"}
          {course.estimatedMinutes > 0 && ` · ~${Math.round(course.estimatedMinutes / 60)} hrs`}
        </p>
        {active && (
          <div className="relative mt-4 flex items-center gap-2.5">
            <div className="h-1.5 max-w-56 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-white/90">{progressPercent}%</span>
          </div>
        )}
      </div>

      {course.description && (
        <p className="mt-4 text-sm text-text-secondary">{course.description}</p>
      )}

      {!active && canModerate && (
        <p className="mt-4 rounded-md bg-accent-soft p-2.5 text-xs font-medium text-accent-soft-fg">
          Previewing — you don&apos;t have an access grant for this course.
        </p>
      )}

      {active && !nextLesson && needsAssessment && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-accent-soft p-3 text-accent-soft-fg">
          <p className="text-sm font-medium">
            You&apos;ve finished every lesson — take the assessment to earn your certificate.
          </p>
          <Button size="sm" onClick={() => router.push(`/assignments/${qualifyingAssignment!.id}`)}>
            Take the assessment →
          </Button>
        </div>
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
            // The assessment prompt above is the actual call-to-action once
            // every lesson is done — this just confirms the lesson side is
            // finished, whether or not an assessment still stands between
            // here and the certificate.
            <Badge variant="success">All lessons complete</Badge>
          ))}
      </div>
    </div>
  );
}
