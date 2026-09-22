import { RESOURCES, type Resource } from "@/config/permissions";
import type { Permission } from "@/types/domain";

export interface NavItem {
  label: string;
  href: string;
  /** Omitted = always visible (every account has the Learner role). */
  requires?: { resource: Resource; action: Permission["action"] };
  /** Only ever shown to the one Yughma Tech platform org — client company
   * accounts never see these regardless of their own permissions. */
  platformOnly?: boolean;
}

export interface NavSection {
  /** Omitted for the flat Learning-mode list; present for Manage-mode groups. */
  heading?: string;
  items: NavItem[];
}

/**
 * Learning-mode nav. The original Shell wireframes listed 5 flat items;
 * Assignments was added when that module shipped, then My Skills with
 * Phase 2 — a learner otherwise has no way to reach their own work. That
 * grew past the point a single list stays scannable, so this is grouped the
 * same way Manage mode already is: "Learn" (content), "My Work" (things due
 * from you), "My Progress" (what you've earned). Home stays ungrouped —
 * it's the landing page, not a category of its own.
 */
export const LEARNING_NAV: NavSection[] = [
  { items: [{ label: "Home", href: "/home" }] },
  {
    heading: "Learn",
    items: [
      { label: "Courses", href: "/courses" },
      { label: "Learning Paths", href: "/learning-paths" },
      { label: "Learning Plans", href: "/learning-plans" },
      { label: "Calendar", href: "/calendar" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    heading: "My Work",
    items: [{ label: "Assignments", href: "/assignments" }],
  },
  {
    heading: "My Progress",
    items: [
      { label: "My Skills", href: "/skills" },
      { label: "Certificates", href: "/certificates" },
    ],
  },
];

/**
 * Manage-mode nav — permission-scoped sections per the Shell's mode-switch
 * model. A section (and each item within it) only renders for accounts
 * holding the matching permission — see components/shell/Sidebar.tsx.
 */
export const MANAGE_NAV: NavSection[] = [
  {
    heading: "Content",
    items: [
      { label: "Courses", href: "/manage/courses", requires: { resource: RESOURCES.courses, action: "edit" } },
      { label: "Content Library", href: "/manage/content", requires: { resource: RESOURCES.courses, action: "edit" } },
      { label: "Paths", href: "/manage/paths", requires: { resource: RESOURCES.courses, action: "edit" } },
      { label: "Learning Plans", href: "/manage/learning-plans", requires: { resource: RESOURCES.courses, action: "edit" } },
      { label: "Skills", href: "/manage/skills", requires: { resource: RESOURCES.courses, action: "edit" } },
    ],
  },
  {
    heading: "Assess",
    items: [
      { label: "Course Access", href: "/manage/enrollments", requires: { resource: RESOURCES.courses, action: "edit" }, platformOnly: true },
      { label: "Path Access", href: "/manage/path-access", requires: { resource: RESOURCES.courses, action: "edit" }, platformOnly: true },
      { label: "Assignments", href: "/manage/assignments", requires: { resource: RESOURCES.courses, action: "edit" } },
      { label: "Certificates", href: "/manage/certificates", requires: { resource: RESOURCES.courses, action: "edit" } },
    ],
  },
  {
    heading: "Team",
    items: [
      { label: "Team Overview", href: "/manage/team", requires: { resource: RESOURCES.team, action: "view" } },
      { label: "Reports", href: "/manage/reports", requires: { resource: RESOURCES.reports, action: "view" } },
      { label: "Analytics", href: "/manage/analytics", requires: { resource: RESOURCES.reports, action: "view" } },
      { label: "Leads", href: "/manage/leads", requires: { resource: RESOURCES.reports, action: "view" } },
      { label: "Moderation Queue", href: "/manage/moderation", requires: { resource: RESOURCES.courses, action: "edit" } },
    ],
  },
  {
    heading: "Organization",
    items: [
      { label: "Companies", href: "/manage/companies", platformOnly: true },
      { label: "All Employees", href: "/manage/employees", platformOnly: true },
      { label: "Users", href: "/manage/users", requires: { resource: RESOURCES.users, action: "view" } },
      { label: "Roles", href: "/manage/roles", requires: { resource: RESOURCES.roles, action: "view" } },
      { label: "Audit Log", href: "/manage/audit-log", requires: { resource: RESOURCES.roles, action: "view" } },
      { label: "xAPI Statements", href: "/manage/xapi", requires: { resource: RESOURCES.roles, action: "view" } },
      { label: "Settings", href: "/manage/settings", requires: { resource: RESOURCES.settings, action: "view" } },
      { label: "Integrations", href: "/manage/integrations", requires: { resource: RESOURCES.settings, action: "manage" } },
      { label: "Plan", href: "/manage/plan", requires: { resource: RESOURCES.settings, action: "manage" } },
    ],
  },
];
