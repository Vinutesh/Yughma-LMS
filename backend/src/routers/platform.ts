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
 * individual learner's account, or grants/revokes their access to a
 * course — none of that is self-service anywhere else anymore.
 *
 * Every client-org role template here deliberately excludes any
 * `courses`/`assignments`/`quizzes` permission — companies consume content
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
});
