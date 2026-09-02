# Open Questions — User Management

No new questions — narrowing this module's scope the same way as Organization Management, consistent with "keep it simple":

- **In scope:** User list (with an Active/Deactivated view, not a separate screen), Invite user (reusing the same multi-email pattern from Onboarding Step 3), User detail panel (admin view — role, department/team, status, and the actions: change role, deactivate/reactivate, impersonate), deactivate confirm, and the impersonation banner state.
- **Deferred out of this pass:**
  - **Bulk CSV/SIS import** — the simple multi-email invite covers small-to-medium team growth; CSV import is a larger, separate piece of work for a later pass once there's a real customer asking for it.
  - **Merge duplicate accounts** — an edge-case admin tool, not needed for a v1 simple pass.
  - **Self-view user profile** — belongs conceptually to the future Settings module (personal settings), not User Management, which this pass treats as purely admin-facing user administration.
  - **Role *editing*** — this module lets an admin *assign* an existing role to a user via a simple dropdown; building/customizing roles themselves is [Roles & Permissions](../05-roles-permissions/), the next module.
