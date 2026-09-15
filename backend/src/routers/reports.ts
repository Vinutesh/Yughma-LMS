import { z } from "zod";
import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/reports.ts`. Courses/assignments
 * only ever live in the one platform org now (see BACKEND_PLAN.md's
 * platform-model note), so they're read via `ctx.rawDb` — the caller's own
 * org (a client company) never owns any itself, and `ctx.db.course` would
 * come back empty for every client-org manager. `User` stays on `ctx.db`
 * (tenant-scoped to the caller's own company), and every `Enrollment` query
 * explicitly filters `userId: { in: userIds }` from that scoped set — since
 * `Enrollment` carries no `orgId` of its own (see tenantScope.ts), that
 * explicit filter is the only thing standing between a manager and another
 * company's completion data.
 */

const dateRangeSchema = z.enum(["7d", "30d", "90d", "all"]);
const filtersSchema = z.object({ dateRange: dateRangeSchema, departmentId: z.string().optional() });

/** Returns -Infinity for "all" so a plain `>=` comparison never excludes anything. */
function rangeStart(range: z.infer<typeof dateRangeSchema>): number {
  const days = { "7d": 7, "30d": 30, "90d": 90, all: Infinity }[range];
  return days === Infinity ? -Infinity : Date.now() - days * 86400000;
}

export const reportsRouter = router({
  completion: requirePermission("reports", "view")
    .input(filtersSchema)
    .query(async ({ ctx, input }) => {
      const since = rangeStart(input.dateRange);
      const courses = await ctx.rawDb.course.findMany({ select: { id: true, title: true } });
      const courseIds = courses.map((c) => c.id);
      const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));
      const users = await ctx.db.user.findMany({ select: { id: true, name: true, departmentId: true } });
      const userById = new Map(users.map((u) => [u.id, u]));
      const userIds = users.map((u) => u.id);

      const enrollments = await ctx.rawDb.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          userId: { in: userIds },
          status: "completed",
          completedAt: since === -Infinity ? { not: null } : { gte: new Date(since) },
        },
      });

      return enrollments
        .filter((e) => !input.departmentId || userById.get(e.userId)?.departmentId === input.departmentId)
        .flatMap((e) => {
          const user = userById.get(e.userId);
          const courseTitle = courseTitleById.get(e.courseId);
          if (!user || !courseTitle || !e.completedAt) return [];
          return [{ userName: user.name, courseTitle, completedAt: e.completedAt.toISOString() }];
        })
        .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    }),

  engagement: requirePermission("reports", "view")
    .input(filtersSchema)
    .query(async ({ ctx, input }) => {
      const since = rangeStart(input.dateRange);
      const courses = await ctx.rawDb.course.findMany({ select: { id: true, title: true } });
      const courseIds = courses.map((c) => c.id);
      const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));
      const users = await ctx.db.user.findMany({ select: { id: true, name: true, departmentId: true } });
      const userById = new Map(users.map((u) => [u.id, u]));
      const userIds = users.map((u) => u.id);

      const lessons = await ctx.rawDb.lesson.findMany({ where: { courseId: { in: courseIds } }, select: { courseId: true } });
      const lessonCountByCourse = new Map<string, number>();
      for (const l of lessons) lessonCountByCourse.set(l.courseId, (lessonCountByCourse.get(l.courseId) ?? 0) + 1);

      const enrollments = await ctx.rawDb.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          userId: { in: userIds },
          status: "active",
          enrolledAt: since === -Infinity ? undefined : { gte: new Date(since) },
        },
      });

      return enrollments
        .filter((e) => !input.departmentId || userById.get(e.userId)?.departmentId === input.departmentId)
        .flatMap((e) => {
          const user = userById.get(e.userId);
          const courseTitle = courseTitleById.get(e.courseId);
          if (!user || !courseTitle) return [];
          const total = lessonCountByCourse.get(e.courseId) ?? 0;
          const progressPercent = total === 0 ? 0 : Math.round((e.completedLessonIds.length / total) * 100);
          return [{ userName: user.name, courseTitle, progressPercent, lastActivity: e.enrolledAt.toISOString() }];
        })
        .sort((a, b) => b.progressPercent - a.progressPercent);
    }),

  /**
   * "Compliance" courses are approximated as ones with a certificate
   * attached — there's no separate mandatory-training flag in this data
   * model, mirroring the mock's own approximation.
   */
  compliance: requirePermission("reports", "view")
    .input(filtersSchema)
    .query(async ({ ctx, input }) => {
      const courses = await ctx.rawDb.course.findMany({
        where: { certificateTemplateId: { not: null } },
        select: { id: true, title: true },
      });
      const users = await ctx.db.user.findMany({
        where: { status: "active", departmentId: input.departmentId || undefined },
        select: { id: true, name: true },
      });
      const courseIds = courses.map((c) => c.id);
      const userIds = users.map((u) => u.id);
      const enrollments = await ctx.rawDb.enrollment.findMany({
        where: { courseId: { in: courseIds }, userId: { in: userIds } },
      });

      const rows: { userName: string; courseTitle: string; status: "completed" | "in_progress" | "not_started" }[] = [];
      for (const course of courses) {
        for (const user of users) {
          const enrollment = enrollments.find((e) => e.courseId === course.id && e.userId === user.id);
          const status = !enrollment ? "not_started" : enrollment.status === "completed" ? "completed" : "in_progress";
          rows.push({ userName: user.name, courseTitle: course.title, status });
        }
      }
      return rows.sort((a, b) => a.userName.localeCompare(b.userName));
    }),
});
