import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/analytics.ts`. Same tenant-scoping
 * pattern as `reports.ts`: `Course`/`User` are directly scoped, so every
 * `Enrollment`/`Lesson` query below is joined through an already-scoped
 * courseId/userId set instead of trusting those unscoped models directly.
 */

/** Below this many data points a trend is noise, not a signal. */
const MIN_ACTIVITY_FOR_TRENDS = 5;

function last30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
}

function engagementLevel(activeRatio: number): "High" | "Medium" | "Low" {
  if (activeRatio >= 0.6) return "High";
  if (activeRatio >= 0.3) return "Medium";
  return "Low";
}

export const analyticsRouter = router({
  orgOverview: requirePermission("reports", "view").query(async ({ ctx }) => {
    const courses = await ctx.db.course.findMany({ select: { id: true } });
    const courseIds = courses.map((c) => c.id);
    const enrollments = await ctx.db.enrollment.findMany({ where: { courseId: { in: courseIds } } });
    const activeUsers = await ctx.db.user.count({ where: { status: "active" } });

    const completed = enrollments.filter((e) => e.completedAt);
    const days = last30Days();

    const completionsByDay = new Map<string, number>();
    for (const e of completed) {
      const day = e.completedAt!.toISOString().slice(0, 10);
      completionsByDay.set(day, (completionsByDay.get(day) ?? 0) + 1);
    }

    const enrolledByDay = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const day = e.enrolledAt.toISOString().slice(0, 10);
      if (!enrolledByDay.has(day)) enrolledByDay.set(day, new Set());
      enrolledByDay.get(day)!.add(e.userId);
    }

    const seenSoFar = new Set<string>();
    const activeUsersTrend = days.map((day) => {
      for (const id of enrolledByDay.get(day) ?? []) seenSoFar.add(id);
      return { date: day, value: seenSoFar.size };
    });
    const completionsTrend = days.map((day) => ({ date: day, value: completionsByDay.get(day) ?? 0 }));

    const cutoff = Date.now() - 30 * 86400000;
    const completions30d = completed.filter((e) => e.completedAt!.getTime() >= cutoff).length;

    const durations = completed.map((e) => (e.completedAt!.getTime() - e.enrolledAt.getTime()) / 86400000);
    const avgDaysToComplete =
      durations.length === 0 ? null : Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;

    return {
      activeUsers,
      completions30d,
      avgDaysToComplete,
      activeUsersTrend,
      completionsTrend,
      hasEnoughData: enrollments.length >= MIN_ACTIVITY_FOR_TRENDS,
    };
  }),

  courseAnalytics: requirePermission("reports", "view").query(async ({ ctx }) => {
    const courses = await ctx.db.course.findMany({ where: { status: "published" } });
    const courseIds = courses.map((c) => c.id);
    const enrollments = await ctx.db.enrollment.findMany({ where: { courseId: { in: courseIds } } });

    return courses
      .map((course) => {
        const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
        const completed = courseEnrollments.filter((e) => e.status === "completed").length;
        const startedOrMore = courseEnrollments.filter(
          (e) => e.status !== "requested" && e.completedLessonIds.length > 0,
        ).length;
        const completionPercent =
          courseEnrollments.length === 0 ? 0 : Math.round((completed / courseEnrollments.length) * 100);
        const activeRatio = courseEnrollments.length === 0 ? 0 : startedOrMore / courseEnrollments.length;
        return {
          courseId: course.id,
          courseTitle: course.title,
          completionPercent,
          engagement: engagementLevel(activeRatio),
        };
      })
      .sort((a, b) => b.completionPercent - a.completionPercent);
  }),

  /**
   * A rough heuristic, not a scored model: someone with no active
   * enrollments below 30% progress after being enrolled 14+ days reads as
   * falling behind; 30-70% as at risk; everything else as on track.
   */
  learnerBands: requirePermission("reports", "view").query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({ where: { status: "active" } });
    const courses = await ctx.db.course.findMany({ select: { id: true } });
    const courseIds = new Set(courses.map((c) => c.id));
    const userIds = users.map((u) => u.id);

    const enrollments = await ctx.db.enrollment.findMany({ where: { userId: { in: userIds }, status: "active" } });
    const lessons = await ctx.db.lesson.findMany({
      where: { courseId: { in: [...courseIds] } },
      select: { courseId: true },
    });
    const lessonCountByCourse = new Map<string, number>();
    for (const l of lessons) lessonCountByCourse.set(l.courseId, (lessonCountByCourse.get(l.courseId) ?? 0) + 1);

    const counts = { onTrack: 0, atRisk: 0, fallingBehind: 0 };
    for (const user of users) {
      const active = enrollments.filter((e) => e.userId === user.id && courseIds.has(e.courseId));
      if (active.length === 0) {
        counts.onTrack++;
        continue;
      }
      const worst = active.reduce((min, e) => {
        const total = lessonCountByCourse.get(e.courseId) ?? 0;
        const pct = total === 0 ? 100 : (e.completedLessonIds.length / total) * 100;
        const daysEnrolled = (Date.now() - e.enrolledAt.getTime()) / 86400000;
        const adjusted = daysEnrolled >= 14 ? pct : 100;
        return Math.min(min, adjusted);
      }, 100);
      if (worst < 30) counts.fallingBehind++;
      else if (worst < 70) counts.atRisk++;
      else counts.onTrack++;
    }
    return counts;
  }),
});
