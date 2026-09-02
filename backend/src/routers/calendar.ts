import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import type { ScopedDb } from "../trpc/context.js";

/**
 * Mirrors `frontend/src/lib/api/resources/calendar.ts`. `CalendarEvent`
 * carries its own `orgId` (see tenantScope.ts), so it's fully auto-scoped by
 * `ctx.db` for the `canManage` (platform-admin, in practice) branch of
 * `list` and for `create`/`update`/`delete` — those are only ever reachable
 * by a `courses:edit` holder, and that only ever lives in the platform org,
 * which IS the content owner, so `ctx.db` there is already correct.
 *
 * The learner branch of `list` is different: `Course`/`Assignment`/`Quiz`
 * only ever live in the platform org now (see BACKEND_PLAN.md's
 * platform-model note), so those three reads use `ctx.rawDb` instead — a
 * client-org learner's own `ctx.db` would come back empty for all three,
 * silently hiding every deadline and assessment window. Manual
 * `CalendarEvent` rows only ever get created by a platform admin too (same
 * `courses:edit` gate), so a learner's own `ctx.db.calendarEvent` is always
 * empty as well — those are read via `ctx.rawDb`, filtered to events tied
 * to a course the learner actually has access to. An org-wide manual event
 * (`courseId: null`, e.g. an internal Yughma Tech notice) deliberately
 * stays invisible to a client-org learner this way — there's no field
 * marking one as intended for every client company, so the safe default is
 * to surface only what's tied to content they can already see.
 *
 * The mock computed `canManage` client-side and trusted it as an argument;
 * that's exactly the kind of client-supplied authorization decision
 * `roles.ts`'s history warns about, so here it's re-derived from the
 * caller's own roles via `hasEditPermission`, same rank logic
 * `requirePermission` uses, just as a boolean rather than a gate.
 */

async function hasEditPermission(db: ScopedDb, roleIds: string[]): Promise<boolean> {
  const roles = await db.role.findMany({ where: { id: { in: roleIds } }, include: { permissions: true } });
  const rank = { view: 1, edit: 2, manage: 3 } as const;
  return roles.some((role) =>
    role.permissions.some((p) => p.resource === "courses" && rank[p.action as keyof typeof rank] >= rank.edit),
  );
}

export type CalendarItemKind = "deadline" | "assessment_window" | "manual";

export interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  title: string;
  at: Date;
  courseTitle?: string;
  targetUrl?: string;
  description?: string | null;
  link?: string | null;
  createdByUserId?: string;
  eventId?: string;
}

export const calendarRouter = router({
  /**
   * Auto-populated (assignment due dates, assessment windows) plus manual
   * events on one calendar. Scope differs by role: a learner sees the
   * courses they're actively enrolled in; anyone with `courses:edit` sees
   * every course in the org, since they're tracking commitments across
   * courses they teach, not ones they're personally taking.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const canManage = await hasEditPermission(ctx.db, ctx.session.roleIds);
    // Platform admins (the only `canManage` case in practice) stay on
    // `ctx.db` — their own org IS the content owner. Learners read the
    // shared catalog via `ctx.rawDb` instead — see this router's doc
    // comment for why `ctx.db` would come back empty for them.
    const db = canManage ? ctx.db : ctx.rawDb;

    let activeCourseIds: Set<string>;
    if (canManage) {
      const courses = await ctx.db.course.findMany({ select: { id: true } });
      activeCourseIds = new Set(courses.map((c) => c.id));
    } else {
      const enrollments = await ctx.rawDb.enrollment.findMany({
        where: { userId: ctx.session.userId, status: { not: "requested" } },
        select: { courseId: true },
      });
      activeCourseIds = new Set(enrollments.map((e) => e.courseId));
    }

    const courseIdList = [...activeCourseIds];
    const courseTitles = new Map(
      (await db.course.findMany({ where: { id: { in: courseIdList } }, select: { id: true, title: true } })).map(
        (c) => [c.id, c.title] as const,
      ),
    );

    const items: CalendarItem[] = [];

    if (courseIdList.length > 0) {
      const assignments = await db.assignment.findMany({
        where: { courseId: { in: courseIdList }, dueAt: { not: null } },
      });
      for (const a of assignments) {
        if (!a.dueAt) continue;
        items.push({
          id: `deadline_${a.id}`,
          kind: "deadline",
          title: `${a.title} due`,
          at: a.dueAt,
          courseTitle: courseTitles.get(a.courseId),
          targetUrl: `/assignments/${a.id}`,
        });
      }

      const quizzes = await db.quiz.findMany({
        where: { courseId: { in: courseIdList }, kind: "assessment", availableTo: { not: null } },
      });
      for (const q of quizzes) {
        if (!q.availableTo) continue;
        items.push({
          id: `window_${q.id}`,
          kind: "assessment_window",
          title: `${q.title} closes`,
          at: q.availableTo,
          courseTitle: courseTitles.get(q.courseId),
          targetUrl: `/assessments/${q.id}`,
        });
      }
    }

    // A client-org learner only ever sees a manual event tied to a course
    // they have access to — an org-wide one (`courseId: null`) is always a
    // platform-internal notice from this side, never client-visible (see
    // doc comment above). A platform admin previewing their own org still
    // sees everything, org-wide events included.
    const events = canManage
      ? await ctx.db.calendarEvent.findMany({})
      : courseIdList.length > 0
        ? await ctx.rawDb.calendarEvent.findMany({ where: { courseId: { in: courseIdList } } })
        : [];
    for (const e of events) {
      if (e.courseId && !activeCourseIds.has(e.courseId)) continue;
      items.push({
        id: `manual_${e.id}`,
        eventId: e.id,
        kind: "manual",
        title: e.title,
        at: e.startsAt,
        courseTitle: e.courseId ? courseTitles.get(e.courseId) : undefined,
        description: e.description,
        link: e.link,
        createdByUserId: e.createdByUserId,
      });
    }

    return items.sort((a, b) => (a.at < b.at ? -1 : 1));
  }),

  create: requirePermission("courses", "edit")
    .input(
      z.object({
        courseId: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        startsAt: z.coerce.date(),
        link: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.courseId) {
        const course = await ctx.db.course.findUnique({ where: { id: input.courseId } });
        if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      }
      return ctx.db.calendarEvent.create({
        data: {
          orgId: ctx.session.orgId,
          courseId: input.courseId,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          startsAt: input.startsAt,
          link: input.link,
          createdByUserId: ctx.session.userId,
        },
      });
    }),

  update: requirePermission("courses", "edit")
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        startsAt: z.coerce.date().optional(),
        link: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { eventId, ...patch } }) => {
      const event = await ctx.db.calendarEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      return ctx.db.calendarEvent.update({
        where: { id: eventId },
        data: { ...patch, title: patch.title?.trim() },
      });
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.calendarEvent.findUnique({ where: { id: input.eventId } });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      await ctx.db.calendarEvent.delete({ where: { id: input.eventId } });
      return { ok: true };
    }),
});
