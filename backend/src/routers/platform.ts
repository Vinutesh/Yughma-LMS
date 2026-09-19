import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePlatformAdmin } from "../trpc/trpc.js";
import { hashPassword } from "../auth/password.js";
import { sendAccessGrantedEmail, sendWelcomeEmail } from "../email/resend.js";

/**
 * Platform-admin-only operations — gated by `requirePlatformAdmin`, a
 * separate authority tier from every other router's `requirePermission`
 * (see that guard's own doc comment in `trpc.ts`). This is the ONLY place
 * in the backend that creates a client company's account, creates an
 * individual learner's account, grants/revokes their access to a course or
 * learning path, archives/reactivates a company or one of its employees, or
 * reads across every client org at once (`listAllEmployees`) — none of that
 * is self-service or org-scoped anywhere else.
 *
 * Every client-org role template here deliberately excludes any
 * `courses`/`assignments` permission — companies consume content
 * the platform org authors, they never create their own (see
 * BACKEND_PLAN.md's platform-model note). A client's "Org Admin" manages
 * their own people; a "Manager" sees their own team's progress. There is no
 * client-side "Instructor" role anymore — nothing for one to instruct.
 */

const CLIENT_ROLE_SEEDS = [
  {
    name: "Org Admin",
    permissions: [
      { resource: "users", action: "manage" },
      { resource: "roles", action: "manage" },
      { resource: "settings", action: "manage" },
      { resource: "reports", action: "view" },
      { resource: "team", action: "view" },
    ],
  },
  {
    name: "Manager",
    permissions: [
      { resource: "team", action: "view" },
      { resource: "reports", action: "view" },
    ],
  },
] as const;

function generateTempPassword(): string {
  // Readable-ish, still high-entropy — relayed manually (no email sending
  // exists yet, see BACKEND_CREDENTIALS_CHECKLIST.md), so it needs to be
  // something a person can type correctly from a chat message.
  return crypto.randomBytes(9).toString("base64url");
}

export const platformRouter = router({
  listClientOrgs: requirePlatformAdmin.query(({ ctx }) =>
    ctx.rawDb.organization.findMany({ where: { isPlatform: false }, orderBy: { createdAt: "desc" } }),
  ),

  createClientOrg: requirePlatformAdmin
    .input(z.object({ name: z.string().min(1), industry: z.string().optional(), size: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.rawDb.organization.create({
        data: { name: input.name.trim(), industry: input.industry, size: input.size, isPlatform: false },
      });
      const roles = await Promise.all(
        CLIENT_ROLE_SEEDS.map((seed) =>
          ctx.rawDb.role.create({
            data: {
              orgId: org.id,
              name: seed.name,
              isSystemRole: true,
              permissions: { create: seed.permissions.map((p) => ({ resource: p.resource, action: p.action })) },
            },
          }),
        ),
      );
      return { org, roles };
    }),

  listClientUsers: requirePlatformAdmin.input(z.object({ orgId: z.string() })).query(async ({ ctx, input }) => {
    const org = await ctx.rawDb.organization.findUnique({ where: { id: input.orgId } });
    if (!org || org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
    return ctx.rawDb.user.findMany({
      where: { orgId: input.orgId },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** The role templates available within one client org — used to populate
   * the role picker when adding a person, since a platform admin's own
   * roles (in the platform org) aren't the client org's roles. */
  listClientOrgRoles: requirePlatformAdmin.input(z.object({ orgId: z.string() })).query(async ({ ctx, input }) => {
    const org = await ctx.rawDb.organization.findUnique({ where: { id: input.orgId } });
    if (!org || org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
    return ctx.rawDb.role.findMany({ where: { orgId: input.orgId }, orderBy: { name: "asc" } });
  }),

  /**
   * The only path that creates a learner/client-admin account — replaces
   * the removed public self-signup entirely. Returns the temporary
   * password in the response (nowhere else, never persisted in plaintext)
   * so a platform admin can still relay it manually — the welcome email
   * (see `email/resend.ts`) is best-effort and silently no-ops if Resend
   * isn't configured, so the response is never the only copy in practice
   * but always could be.
   */
  createClientUser: requirePlatformAdmin
    .input(z.object({ orgId: z.string(), name: z.string().min(1), email: z.string().email(), roleId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.rawDb.organization.findUnique({ where: { id: input.orgId } });
      if (!org || org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });

      const email = input.email.toLowerCase();
      const existing = await ctx.rawDb.user.findFirst({ where: { email } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email." });

      if (input.roleId) {
        // `Role` has no cross-org identity beyond its own `orgId` — confirm
        // it actually belongs to the target company before assigning it,
        // the same "resolve the tenant-scoped parent first" rule every
        // other router follows for a client-supplied id.
        const role = await ctx.rawDb.role.findFirst({ where: { id: input.roleId, orgId: input.orgId } });
        if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }

      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      const user = await ctx.rawDb.user.create({
        data: { orgId: input.orgId, name: input.name.trim(), email, passwordHash, mustChangePassword: true },
      });
      if (input.roleId) {
        await ctx.rawDb.userRole.create({ data: { userId: user.id, roleId: input.roleId } });
      }

      await sendWelcomeEmail(user.email, user.name, tempPassword);

      return { user, tempPassword };
    }),

  /**
   * Access is granted at whole-course granularity — an `Enrollment` row is
   * the access grant itself, created here (deliberately crossing the
   * course's org and the learner's org, via `rawDb`) rather than through
   * self-service `courses.enroll`, which no longer exists. Also fires an
   * in-app `NotificationItem` (stamped into the *learner's* own org, not
   * the platform org — same `rawDb` + explicit `orgId` pattern as
   * `issueCertificate`) and a best-effort email — a learner otherwise has
   * no way to discover a grant happened short of being told directly.
   */
  grantCourseAccess: requirePlatformAdmin
    .input(z.object({ userId: z.string(), courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // The course must belong to THIS platform org (the caller's own —
      // `requirePlatformAdmin` already confirmed that), never a client
      // org's id smuggled in as if it were a course id.
      const course = await ctx.rawDb.course.findFirst({ where: { id: input.courseId, orgId: ctx.session.orgId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      const user = await ctx.rawDb.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      const enrollment = await ctx.rawDb.enrollment.upsert({
        where: { courseId_userId: { courseId: input.courseId, userId: input.userId } },
        create: { courseId: input.courseId, userId: input.userId, status: "active" },
        update: { status: "active" },
      });

      await ctx.rawDb.notificationItem.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          category: "course_updates",
          title: `You've been granted access to "${course.title}"`,
          targetUrl: `/courses/${course.id}`,
        },
      });
      await sendAccessGrantedEmail(user.email, user.name, course.title);

      return enrollment;
    }),

  revokeCourseAccess: requirePlatformAdmin
    .input(z.object({ userId: z.string(), courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.rawDb.course.findFirst({ where: { id: input.courseId, orgId: ctx.session.orgId } });
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

      await ctx.rawDb.enrollment.deleteMany({ where: { courseId: input.courseId, userId: input.userId } });
      return { ok: true };
    }),

  /** Everyone currently granted access to one course, across every client
   * org — the roster a platform admin manages access from. */
  listCourseGrants: requirePlatformAdmin.input(z.object({ courseId: z.string() })).query(async ({ ctx, input }) => {
    const course = await ctx.rawDb.course.findFirst({ where: { id: input.courseId, orgId: ctx.session.orgId } });
    if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });

    const enrollments = await ctx.rawDb.enrollment.findMany({
      where: { courseId: input.courseId },
      include: { user: { include: { org: true } } },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      userId: e.user.id,
      userName: e.user.name,
      userEmail: e.user.email,
      orgId: e.user.orgId,
      orgName: e.user.org.name,
    }));
  }),

  /** Same shape as `grantCourseAccess`/`revokeCourseAccess`/
   * `listCourseGrants` above, one level up — a `LearningPath` is granted as
   * a whole unit (`PathEnrollment`), never self-service (see `paths.ts`'s
   * `catalog`, which is read-only now). */
  grantPathAccess: requirePlatformAdmin
    .input(z.object({ userId: z.string(), pathId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.rawDb.learningPath.findFirst({ where: { id: input.pathId, orgId: ctx.session.orgId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

      const user = await ctx.rawDb.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      const enrollment = await ctx.rawDb.pathEnrollment.upsert({
        where: { pathId_userId: { pathId: input.pathId, userId: input.userId } },
        create: { pathId: input.pathId, userId: input.userId },
        update: {},
      });

      await ctx.rawDb.notificationItem.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          category: "course_updates",
          title: `You've been granted access to "${path.title}"`,
          targetUrl: `/learning-paths?open=${path.id}`,
        },
      });
      await sendAccessGrantedEmail(user.email, user.name, path.title);

      return enrollment;
    }),

  revokePathAccess: requirePlatformAdmin
    .input(z.object({ userId: z.string(), pathId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const path = await ctx.rawDb.learningPath.findFirst({ where: { id: input.pathId, orgId: ctx.session.orgId } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

      await ctx.rawDb.pathEnrollment.deleteMany({ where: { pathId: input.pathId, userId: input.userId } });
      return { ok: true };
    }),

  /** Everyone currently granted access to one path, across every client
   * org. */
  listPathGrants: requirePlatformAdmin.input(z.object({ pathId: z.string() })).query(async ({ ctx, input }) => {
    const path = await ctx.rawDb.learningPath.findFirst({ where: { id: input.pathId, orgId: ctx.session.orgId } });
    if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Learning path not found." });

    const enrollments = await ctx.rawDb.pathEnrollment.findMany({
      where: { pathId: input.pathId },
      include: { user: { include: { org: true } } },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      userId: e.user.id,
      userName: e.user.name,
      userEmail: e.user.email,
      orgId: e.user.orgId,
      orgName: e.user.org.name,
    }));
  }),

  /**
   * "Remove a company" — archive, not a hard delete: blocks login for every
   * one of its users immediately (`auth/session.ts` re-checks org status on
   * every request, not just at login) while leaving every real record —
   * enrollments, certificates, submissions — untouched and reversible via
   * `reactivateClientOrg`. The platform org itself can never be archived;
   * `listClientOrgs`'s own `isPlatform: false` filter already keeps it off
   * every UI picker, but this guards the mutation directly too, since nothing
   * else stops a crafted request from passing its id.
   */
  archiveClientOrg: requirePlatformAdmin.input(z.object({ orgId: z.string() })).mutation(async ({ ctx, input }) => {
    const org = await ctx.rawDb.organization.findUnique({ where: { id: input.orgId } });
    if (!org || org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
    return ctx.rawDb.organization.update({ where: { id: input.orgId }, data: { status: "archived" } });
  }),

  reactivateClientOrg: requirePlatformAdmin.input(z.object({ orgId: z.string() })).mutation(async ({ ctx, input }) => {
    const org = await ctx.rawDb.organization.findUnique({ where: { id: input.orgId } });
    if (!org || org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
    return ctx.rawDb.organization.update({ where: { id: input.orgId }, data: { status: "active" } });
  }),

  /**
   * "Remove an employee" — the cross-org counterpart to `users.deactivate`/
   * `users.reactivate`, which only ever operate on the caller's own
   * tenant-scoped org (never reachable for a platform admin managing a
   * *client* org's people, since the platform admin's own `ctx.db` is
   * scoped to the platform org). Same archive-not-delete reasoning as
   * `archiveClientOrg` — blocks login, keeps every real record.
   */
  deactivateClientUser: requirePlatformAdmin.input(z.object({ userId: z.string() })).mutation(async ({ ctx, input }) => {
    const user = await ctx.rawDb.user.findUnique({ where: { id: input.userId }, include: { org: true } });
    if (!user || user.org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    return ctx.rawDb.user.update({ where: { id: input.userId }, data: { status: "deactivated" } });
  }),

  reactivateClientUser: requirePlatformAdmin.input(z.object({ userId: z.string() })).mutation(async ({ ctx, input }) => {
    const user = await ctx.rawDb.user.findUnique({ where: { id: input.userId }, include: { org: true } });
    if (!user || user.org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    return ctx.rawDb.user.update({ where: { id: input.userId }, data: { status: "active" } });
  }),

  /**
   * Every employee at every client company in one query — the directory a
   * platform admin uses to find someone without first knowing which
   * company they're at, and to see who each company's managers/admins are.
   * `listClientUsers` above is the per-company equivalent this doesn't
   * replace (the Companies page still drills into one org at a time); this
   * is the flat, cross-org view.
   */
  listAllEmployees: requirePlatformAdmin.query(async ({ ctx }) => {
    const users = await ctx.rawDb.user.findMany({
      where: { org: { isPlatform: false } },
      include: { org: true, roles: { include: { role: true } } },
      orderBy: [{ org: { name: "asc" } }, { name: "asc" }],
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      orgId: u.orgId,
      orgName: u.org.name,
      orgStatus: u.org.status,
      roleNames: u.roles.map((r) => r.role.name),
      createdAt: u.createdAt,
    }));
  }),

  /**
   * A full export of one client-org user's personal data — the technical
   * mechanism for honoring a data-portability/access request under DPDP
   * 2023 / GDPR, not just a policy promise. Deliberately read-only and
   * flat: every table that carries this user's personal data, in one
   * response, so the caller can hand it to the person or archive it as
   * proof a request was fulfilled. Excludes other people's data even where
   * this user appears only as a side reference (e.g. who graded their
   * submission), since exporting IS this user's data, not the org's.
   */
  exportUserData: requirePlatformAdmin.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    const user = await ctx.rawDb.user.findUnique({
      where: { id: input.userId },
      include: { org: true, roles: { include: { role: true } }, department: true, team: true },
    });
    if (!user || user.org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

    const [enrollments, pathEnrollments, certificates, submissions, notifications, posts, contentReports, auditLogEntries] =
      await Promise.all([
        ctx.rawDb.enrollment.findMany({ where: { userId: input.userId }, include: { course: { select: { title: true } } } }),
        ctx.rawDb.pathEnrollment.findMany({ where: { userId: input.userId }, include: { path: { select: { title: true } } } }),
        ctx.rawDb.certificate.findMany({ where: { userId: input.userId } }),
        ctx.rawDb.submission.findMany({ where: { userId: input.userId } }),
        ctx.rawDb.notificationItem.findMany({ where: { userId: input.userId } }),
        ctx.rawDb.post.findMany({ where: { authorUserId: input.userId } }),
        ctx.rawDb.contentReport.findMany({ where: { reportedByUserId: input.userId } }),
        ctx.rawDb.auditLogEntry.findMany({ where: { actorUserId: input.userId } }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        organization: user.org.name,
        department: user.department?.name ?? null,
        team: user.team?.name ?? null,
        roles: user.roles.map((r) => r.role.name),
      },
      courseEnrollments: enrollments.map((e) => ({
        course: e.course.title,
        status: e.status,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        completedLessonIds: e.completedLessonIds,
      })),
      pathEnrollments: pathEnrollments.map((e) => ({
        path: e.path.title,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
      })),
      certificates: certificates.map((c) => ({
        title: c.sourceTitle,
        issuedAt: c.issuedAt,
        verificationCode: c.verificationCode,
        revoked: c.revoked,
      })),
      submissions: submissions.map((s) => ({
        submittedAt: s.submittedAt,
        text: s.text,
        score: s.score,
        feedback: s.feedback,
      })),
      notifications: notifications.map((n) => ({ title: n.title, category: n.category, createdAt: n.createdAt })),
      communityPosts: posts.map((p) => ({ body: p.body, createdAt: p.createdAt })),
      contentReportsFiled: contentReports.map((r) => ({ reason: r.reason, createdAt: r.createdAt })),
      auditLogActions: auditLogEntries.map((a) => ({ action: a.action, summary: a.summary, at: a.at })),
    };
  }),

  /**
   * Permanent erasure — distinct from `deactivateClientUser`'s reversible
   * archive. This actually deletes the row, cascading through every
   * relation declared `onDelete: Cascade` in schema.prisma (enrollments,
   * certificates, submissions, notifications, sessions, etc). Requires the
   * user to already be deactivated first, so erasure is always a deliberate
   * second step, never a one-click accident on an active account.
   *
   * A user who has authored platform content (a course, an uploaded asset,
   * a discussion thread) sits behind a required, non-cascading foreign key
   * on that content — deleting them would either fail outright or, if
   * forced, delete content other people still rely on. Rather than
   * silently cascading through someone else's course, this surfaces that
   * as a clear error and leaves the decision (reassign authorship, or keep
   * the account archived instead of erased) to a human.
   */
  eraseClientUser: requirePlatformAdmin.input(z.object({ userId: z.string() })).mutation(async ({ ctx, input }) => {
    const user = await ctx.rawDb.user.findUnique({ where: { id: input.userId }, include: { org: true } });
    if (!user || user.org.isPlatform) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    if (user.status !== "deactivated") {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Deactivate this person before permanently erasing their data." });
    }

    try {
      await ctx.rawDb.user.delete({ where: { id: input.userId } });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Foreign key constraint")) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This person authored content still in use (a course, an uploaded asset, or a discussion thread) and can't be erased until that content is reassigned or removed. They remain deactivated in the meantime.",
        });
      }
      throw err;
    }
    return { ok: true };
  }),
});
