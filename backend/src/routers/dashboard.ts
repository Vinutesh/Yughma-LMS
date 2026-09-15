import { router, requirePermission } from "../trpc/trpc.js";

/**
 * Mirrors `frontend/src/lib/api/resources/dashboard.ts`. One dashboard
 * variant per procedure, gated by the same permission the frontend page uses
 * to pick a variant (`users:view` → org admin, `courses:edit` → instructor,
 * `team:view` → manager) — see `manage/dashboard/page.tsx`.
 *
 * `getManagerDashboard` drops the mock's `managerUserId` argument: the
 * backend always scopes to `ctx.session.userId`, never a client-supplied id.
 *
 * `Course`/`Assignment`/`Certificate` only ever live in the one platform org
 * (see BACKEND_PLAN.md's platform-model note) — `orgAdmin` and `manager`
 * below are reachable by client-org roles, whose own `ctx.db` would come
 * back empty for any of those, so they're read via `ctx.rawDb` instead.
 * `instructor` stays entirely on `ctx.db`: `courses:edit` is only ever
 * granted within the platform org itself, so the caller's own org IS the
 * content owner there. `Submission`/`Enrollment` carry no `orgId` of their
 * own (see tenantScope.ts), so every query against them below explicitly
 * filters by an already-scoped id set (the caller's own users/team) rather
 * than relying on scoping that doesn't exist for them.
 */

export const dashboardRouter = router({
  orgAdmin: requirePermission("users", "view").query(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const courses = await ctx.rawDb.course.findMany({ select: { id: true } });
    const courseIds = courses.map((c) => c.id);
    const userIds = (await ctx.db.user.findMany({ select: { id: true } })).map((u) => u.id);

    const [activeUsers, departments, completionsLast30Days] = await Promise.all([
      ctx.db.user.count({ where: { status: "active" } }),
      ctx.db.department.count({ where: { archived: false } }),
      ctx.rawDb.enrollment.count({
        where: { courseId: { in: courseIds }, userId: { in: userIds }, completedAt: { gte: cutoff } },
      }),
    ]);

    return { activeUsers, completionsLast30Days, departments };
  }),

  instructor: requirePermission("courses", "edit").query(async ({ ctx }) => {
    const assignments = await ctx.db.assignment.findMany();
    const assignmentIds = assignments.map((a) => a.id);
    const submissions = await ctx.db.submission.findMany({ where: { assignmentId: { in: assignmentIds } } });
    const courses = await ctx.db.course.findMany();
    const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

    const needsGrading = assignments
      .map((a) => {
        const ungradedCount = submissions.filter((s) => s.assignmentId === a.id && s.score === null).length;
        return {
          assignmentId: a.id,
          title: a.title,
          courseTitle: courseTitleById.get(a.courseId) ?? "Unknown course",
          ungradedCount,
        };
      })
      .filter((row) => row.ungradedCount > 0)
      .sort((a, b) => b.ungradedCount - a.ungradedCount);

    const publishedCourses = courses.filter((c) => c.status === "published");
    const publishedCourseIds = publishedCourses.map((c) => c.id);
    const enrollments = await ctx.db.enrollment.findMany({
      where: { courseId: { in: publishedCourseIds }, status: { not: "requested" } },
    });
    const lowEngagement = publishedCourses
      .map((c) => {
        const active = enrollments.filter((e) => e.courseId === c.id);
        const notStartedCount = active.filter((e) => e.completedLessonIds.length === 0).length;
        return { courseId: c.id, courseTitle: c.title, notStartedCount };
      })
      .filter((row) => row.notStartedCount > 0)
      .sort((a, b) => b.notStartedCount - a.notStartedCount);

    const recentSubmissionRows = [...submissions]
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
      .slice(0, 5);
    const learnerIds = [...new Set(recentSubmissionRows.map((s) => s.userId))];
    const learners = await ctx.db.user.findMany({ where: { id: { in: learnerIds } }, select: { id: true, name: true } });
    const learnerNameById = new Map(learners.map((u) => [u.id, u.name]));
    const assignmentTitleById = new Map(assignments.map((a) => [a.id, a.title]));
    const recentSubmissions = recentSubmissionRows.map((s) => ({
      submissionId: s.id,
      assignmentId: s.assignmentId,
      learnerName: learnerNameById.get(s.userId) ?? "Unknown",
      assignmentTitle: assignmentTitleById.get(s.assignmentId) ?? "Assignment",
      submittedAt: s.submittedAt.toISOString(),
    }));

    return {
      needsGrading,
      lowEngagement,
      recentSubmissions,
      empty: needsGrading.length === 0 && lowEngagement.length === 0 && recentSubmissions.length === 0,
    };
  }),

  /**
   * Scoped to the manager's own department — a manager with no department
   * assigned sees an empty team rather than everyone.
   */
  manager: requirePermission("team", "view").query(async ({ ctx }) => {
    const manager = await ctx.db.user.findUnique({ where: { id: ctx.session.userId } });
    const team = manager?.departmentId
      ? await ctx.db.user.findMany({
          where: { departmentId: manager.departmentId, id: { not: ctx.session.userId }, status: "active" },
        })
      : [];

    const teamIds = team.map((u) => u.id);
    const teamEnrollments = await ctx.rawDb.enrollment.findMany({
      where: { userId: { in: teamIds }, status: { not: "requested" } },
    });
    const completed = teamEnrollments.filter((e) => e.status === "completed").length;
    const completionPercent = teamEnrollments.length === 0 ? 0 : Math.round((completed / teamEnrollments.length) * 100);

    const now = Date.now();
    const overdueAssignments = await ctx.rawDb.assignment.findMany({ where: { dueAt: { not: null } } });
    const courses = await ctx.rawDb.course.findMany();
    const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));
    const submissions = await ctx.rawDb.submission.findMany({
      where: { assignmentId: { in: overdueAssignments.map((a) => a.id) }, userId: { in: teamIds } },
    });

    const overdue: { userId: string; learnerName: string; courseTitle: string; daysOverdue: number }[] = [];
    for (const assignment of overdueAssignments) {
      const due = assignment.dueAt!.getTime();
      if (due >= now) continue;
      const courseTitle = courseTitleById.get(assignment.courseId) ?? "Unknown course";
      for (const member of team) {
        const enrolled = teamEnrollments.some((e) => e.userId === member.id && e.courseId === assignment.courseId);
        if (!enrolled) continue;
        const submitted = submissions.some((s) => s.assignmentId === assignment.id && s.userId === member.id);
        if (submitted) continue;
        overdue.push({
          userId: member.id,
          learnerName: member.name,
          courseTitle,
          daysOverdue: Math.max(1, Math.floor((now - due) / 86400000)),
        });
      }
    }

    return { teamSize: team.length, completionPercent, overdue: overdue.sort((a, b) => b.daysOverdue - a.daysOverdue) };
  }),
});
