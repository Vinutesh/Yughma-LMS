# Step 1 — User Journey — Roles & Permissions

Persona: **Org Admin**, in Manage mode → Organization → Roles.

## Journey 1 — Reviewing existing roles

1. Opens Roles — sees the 4 system roles (Learner, Instructor, Manager, Org Admin) as fixed cards, plus any custom roles below them.
2. Clicks a system role to view (not edit) its permission matrix — useful for understanding "what can an Instructor actually do" before deciding whether a custom role is needed.

## Journey 2 — Creating a custom role

1. "Create role" — names it (e.g., "Course Approver") and picks a starting point: clone from an existing role's permissions, or start blank. Cloning is the recommended default in the UI (pre-selected) since starting from nothing is tedious and error-prone.
2. Lands on the permission matrix editor for the new role: categories (Courses, Assignments, Reports, Users, Settings, ...) down the side, actions (View / Edit / Manage) across the top, checkboxes at the intersections.
3. Saves. The role now appears in the list and becomes assignable from User Management.

## Journey 3 — Editing a role already in use

1. Opens an existing custom role that's assigned to several people.
2. A persistent banner across the top of the matrix editor: "This role is assigned to 12 people. Changes apply immediately when you save." — not a blocking dialog, just an ambient reminder while they work.
3. Saves — the warning was informational, not a gate; no second confirmation screen.

## Edge cases

- **Editing your own role to remove your own Roles-management permission:** blocked with an explicit message — same shape as User Management's "last remaining Org Admin" block — an admin should never be able to lock themselves out of the permission screen they're currently looking at.
- **Deleting a custom role that's still assigned to people:** blocked (not archived, since roles — unlike departments — have no historical-reporting reason to keep a "dead" role around); must reassign those people to a different role first, from this screen (a shortcut list of affected users, not a trip to User Management).
- **Two admins editing the same custom role at once:** out of scope for this design pass (real-time collaboration/locking is a backend concern) — flagged so it isn't silently forgotten.

## What this rules in for Step 2 (User Flow)

- View vs. edit is a real distinction for system roles (view-only) but not for custom roles (always editable by someone with Roles-management permission).
- Clone-then-edit is the primary role-creation path, not a blank-slate form.
- Self-lockout prevention needs the same explicit-block pattern already established in User Management, for consistency.
