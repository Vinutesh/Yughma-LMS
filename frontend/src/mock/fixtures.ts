import type {
  AuditLogEntry,
  Department,
  NotificationItem,
  NotificationPreferences,
  Organization,
  Role,
  Team,
  User,
} from "@/types/domain";
import { RESOURCES } from "@/config/permissions";

export const MOCK_ORG: Organization = {
  id: "org_acme",
  name: "Acme Corp",
  isPlatform: false,
  status: "active",
  industry: "Technology",
  size: "51–200",
  // Comfortably mid-trial by default, so neither the ending-soon banner nor the
  // expired block fires until deliberately shifted (see DevTrialMenu).
  trialEndsAt: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
};

export const MOCK_DEPARTMENTS: Department[] = [
  { id: "dept_sales", orgId: MOCK_ORG.id, name: "Sales", archived: false },
  { id: "dept_engineering", orgId: MOCK_ORG.id, name: "Engineering", archived: false },
];

export const MOCK_TEAMS: Team[] = [
  { id: "team_sales_west", orgId: MOCK_ORG.id, departmentId: "dept_sales", name: "Sales — West", archived: false },
  { id: "team_sales_east", orgId: MOCK_ORG.id, departmentId: "dept_sales", name: "Sales — East", archived: false },
];

/**
 * The 4 system roles from the Roles & Permissions module design
 * (LMS/docs/modules/05-roles-permissions), reproduced here as the seed data
 * the mock session/permission layer resolves against.
 */
export const MOCK_ROLES: Role[] = [
  {
    id: "role_learner",
    name: "Learner",
    isSystemRole: true,
    permissions: [],
  },
  {
    id: "role_instructor",
    name: "Instructor",
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.courses, action: "edit" },
      { resource: RESOURCES.assignments, action: "edit" },
      { resource: RESOURCES.reports, action: "view" },
    ],
  },
  {
    id: "role_manager",
    name: "Manager",
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.team, action: "view" },
      { resource: RESOURCES.reports, action: "view" },
    ],
  },
  {
    id: "role_org_admin",
    name: "Org Admin",
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.users, action: "manage" },
      { resource: RESOURCES.roles, action: "manage" },
      { resource: RESOURCES.settings, action: "manage" },
      { resource: RESOURCES.courses, action: "manage" },
      { resource: RESOURCES.assignments, action: "manage" },
      { resource: RESOURCES.reports, action: "view" },
      { resource: RESOURCES.team, action: "view" },
    ],
  },
];

/**
 * 4 seeded accounts, one per role, so the dev role switcher can demonstrate
 * permission-scoped nav / mode switching without a real backend.
 * Every account also implicitly holds Learner (per the Shell's mode-switch
 * model — someone with Instructor/Manager/Org Admin still has a Learning
 * mode). Password for every seeded account: "password" (mock-only).
 */
export const MOCK_USERS: User[] = [
  {
    id: "user_jamie",
    name: "Jamie Lee",
    email: "jamie@acmecorp.com",
    orgId: MOCK_ORG.id,
    roleIds: ["role_learner"],
    status: "active",
  },
  {
    id: "user_priya",
    name: "Priya Sharma",
    email: "priya@acmecorp.com",
    orgId: MOCK_ORG.id,
    roleIds: ["role_learner", "role_instructor"],
    status: "active",
    departmentId: "dept_sales",
    teamId: "team_sales_west",
  },
  {
    id: "user_raj",
    name: "Raj Patel",
    email: "raj@acmecorp.com",
    orgId: MOCK_ORG.id,
    roleIds: ["role_learner", "role_manager"],
    status: "active",
    departmentId: "dept_engineering",
  },
  {
    id: "user_admin",
    name: "Alex Admin",
    email: "alex@acmecorp.com",
    orgId: MOCK_ORG.id,
    roleIds: ["role_learner", "role_org_admin"],
    status: "active",
  },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    userId: "user_jamie",
    category: "grading",
    title: 'Priya graded your submission: "Culture Reflection"',
    targetUrl: "/assignments/asg_culture",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    userId: "user_raj",
    category: "deadlines",
    title: 'Assignment "Week 3 Reflection" due tomorrow',
    targetUrl: "/assignments/asg_reflection",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    userId: "user_jamie",
    category: "course_updates",
    title: 'New course published: "Sales Fundamentals"',
    targetUrl: "/courses/course_sales",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const DEFAULT_NOTIFICATION_CATEGORIES: NotificationPreferences["categories"] = {
  grading: { inApp: true, email: true },
  deadlines: { inApp: true, email: false },
  course_updates: { inApp: true, email: false },
  team_admin: { inApp: true, email: true },
  community: { inApp: true, email: false },
};

export const MOCK_NOTIFICATION_PREFERENCES: NotificationPreferences[] = MOCK_USERS.map((u) => ({
  userId: u.id,
  categories: { ...DEFAULT_NOTIFICATION_CATEGORIES },
}));

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "audit_role_raj",
    orgId: MOCK_ORG.id,
    at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    actorUserId: "user_admin",
    action: "role_changed",
    summary: "Changed role",
    targetLabel: "Raj Patel",
    detail: { from: "Learner", to: "Learner, Manager" },
  },
  {
    id: "audit_course_archived",
    orgId: MOCK_ORG.id,
    at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    actorUserId: "user_priya",
    action: "course_archived",
    summary: "Course archived",
    targetLabel: "Data Fundamentals",
  },
];
