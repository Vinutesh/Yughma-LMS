import { router } from "../trpc/trpc.js";
import { usersRouter } from "./users.js";
import { authRouter } from "./auth.js";
import { rolesRouter } from "./roles.js";
import { organizationsRouter } from "./organizations.js";
import { coursesRouter } from "./courses.js";
import { contentRouter } from "./content.js";
import { certificatesRouter } from "./certificates.js";
import { assignmentsRouter } from "./assignments.js";
import { billingRouter } from "./billing.js";
import { integrationsRouter } from "./integrations.js";
import { scormRouter } from "./scorm.js";
import { calendarRouter } from "./calendar.js";
import { notificationsRouter } from "./notifications.js";
import { communitiesRouter } from "./communities.js";
import { reportsRouter } from "./reports.js";
import { analyticsRouter } from "./analytics.js";
import { dashboardRouter } from "./dashboard.js";
import { auditLogRouter } from "./auditLog.js";
import { pathsRouter } from "./paths.js";
import { learningPlansRouter } from "./learningPlans.js";
import { skillsRouter } from "./skills.js";
import { platformRouter } from "./platform.js";

/**
 * Root router. Add one sub-router per resource-client file as it migrates —
 * see the order in BACKEND_PLAN.md. `auth`/`users`/`roles`/`organizations`
 * came first as the walking-skeleton step; `courses`/`content`/`certificates`
 * are the core learning-loop pass after that.
 */
export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  roles: rolesRouter,
  organizations: organizationsRouter,
  courses: coursesRouter,
  content: contentRouter,
  certificates: certificatesRouter,
  assignments: assignmentsRouter,
  calendar: calendarRouter,
  notifications: notificationsRouter,
  communities: communitiesRouter,
  reports: reportsRouter,
  analytics: analyticsRouter,
  dashboard: dashboardRouter,
  auditLog: auditLogRouter,
  paths: pathsRouter,
  learningPlans: learningPlansRouter,
  skills: skillsRouter,
  billing: billingRouter,
  integrations: integrationsRouter,
  scorm: scormRouter,
  platform: platformRouter,
});

export type AppRouter = typeof appRouter;
