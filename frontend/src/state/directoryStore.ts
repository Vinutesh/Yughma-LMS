"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditLogEntry,
  Department,
  NotificationItem,
  NotificationPreferences,
  Organization,
  Permission,
  Role,
  Team,
  User,
} from "@/types/domain";
import {
  MOCK_AUDIT_LOG,
  MOCK_DEPARTMENTS,
  MOCK_NOTIFICATIONS,
  MOCK_NOTIFICATION_PREFERENCES,
  MOCK_ORG,
  MOCK_ROLES,
  MOCK_TEAMS,
  MOCK_USERS,
} from "@/mock/fixtures";

/**
 * The shared mutable mock "database" — every resource client
 * (auth/orgs/users/organizations/roles) reads and writes through this
 * instead of the static fixtures directly, so changes made in one screen
 * (e.g. a role edit in Roles & Permissions) are visible everywhere else
 * (e.g. on next login). Persisted to localStorage so it survives
 * navigation/reload within a browser — not a real backend, but a closer
 * stand-in than static fixtures. MSW/network-level mocking is still the
 * planned fast-follow per the frontend kickoff plan.
 */
interface DirectoryState {
  orgs: Organization[];
  users: User[];
  departments: Department[];
  teams: Team[];
  roles: Role[];

  addOrg: (org: Organization) => void;
  addUser: (user: User) => void;
  updateOrg: (orgId: string, patch: Partial<Organization>) => void;
  updateUserRoles: (userId: string, roleIds: string[]) => void;
  updateUserAssignment: (userId: string, departmentId?: string, teamId?: string) => void;
  setUserStatus: (userId: string, status: User["status"]) => void;
  addDepartment: (orgId: string, name: string) => Department;
  addTeam: (orgId: string, departmentId: string, name: string) => Team;
  renameDepartment: (id: string, name: string) => void;
  renameTeam: (id: string, name: string) => void;
  archiveDepartment: (id: string) => void;
  archiveTeam: (id: string) => void;
  addRole: (role: Role) => void;
  updateRolePermissions: (roleId: string, permissions: Permission[]) => void;
  deleteRole: (roleId: string) => void;

  notifications: NotificationItem[];
  notificationPreferences: NotificationPreferences[];
  addNotification: (n: NotificationItem) => void;
  markNotificationRead: (id: string, read: boolean) => void;
  markAllNotificationsRead: (userId: string) => void;
  updateNotificationPreferences: (userId: string, patch: Partial<NotificationPreferences["categories"]>) => void;

  auditLog: AuditLogEntry[];
  addAuditEntry: (entry: AuditLogEntry) => void;
}

export const useDirectoryStore = create<DirectoryState>()(
  persist(
    (set, get) => ({
      orgs: [MOCK_ORG],
      users: MOCK_USERS,
      departments: MOCK_DEPARTMENTS,
      teams: MOCK_TEAMS,
      roles: MOCK_ROLES,

      addOrg: (org) => set((s) => ({ orgs: [...s.orgs, org] })),
      addUser: (user) => set((s) => ({ users: [...s.users, user] })),

      updateOrg: (orgId, patch) =>
        set((s) => ({
          orgs: s.orgs.map((o) => (o.id === orgId ? { ...o, ...patch } : o)),
        })),

      updateUserRoles: (userId, roleIds) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === userId ? { ...u, roleIds } : u)),
        })),

      updateUserAssignment: (userId, departmentId, teamId) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === userId ? { ...u, departmentId, teamId } : u)),
        })),

      setUserStatus: (userId, status) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === userId ? { ...u, status } : u)),
        })),

      addDepartment: (orgId, name) => {
        const dept: Department = { id: `dept_${crypto.randomUUID().slice(0, 8)}`, orgId, name, archived: false };
        set((s) => ({ departments: [...s.departments, dept] }));
        return dept;
      },

      addTeam: (orgId, departmentId, name) => {
        const team: Team = {
          id: `team_${crypto.randomUUID().slice(0, 8)}`,
          orgId,
          departmentId,
          name,
          archived: false,
        };
        set((s) => ({ teams: [...s.teams, team] }));
        return team;
      },

      renameDepartment: (id, name) =>
        set((s) => ({ departments: s.departments.map((d) => (d.id === id ? { ...d, name } : d)) })),
      renameTeam: (id, name) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, name } : t)) })),
      archiveDepartment: (id) =>
        set((s) => ({ departments: s.departments.map((d) => (d.id === id ? { ...d, archived: true } : d)) })),
      archiveTeam: (id) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, archived: true } : t)) })),

      addRole: (role) => set((s) => ({ roles: [...s.roles, role] })),
      updateRolePermissions: (roleId, permissions) =>
        set((s) => ({ roles: s.roles.map((r) => (r.id === roleId ? { ...r, permissions } : r)) })),
      deleteRole: (roleId) => set((s) => ({ roles: get().roles.filter((r) => r.id !== roleId) })),

      notifications: MOCK_NOTIFICATIONS,
      notificationPreferences: MOCK_NOTIFICATION_PREFERENCES,
      addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
      markNotificationRead: (id, read) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)),
        })),
      markAllNotificationsRead: (userId) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n,
          ),
        })),
      updateNotificationPreferences: (userId, patch) =>
        set((s) => ({
          notificationPreferences: s.notificationPreferences.map((p) =>
            p.userId === userId ? { ...p, categories: { ...p.categories, ...patch } } : p,
          ),
        })),

      auditLog: MOCK_AUDIT_LOG,
      addAuditEntry: (entry) => set((s) => ({ auditLog: [entry, ...s.auditLog] })),
    }),
    { name: "yughma-directory" },
  ),
);
