# Step 1 — User Journey — Organization Management

Persona: **Org Admin**, in Manage mode, under Settings.

## Journey 1 — Editing org profile

1. From Manage mode, opens Settings → General tab.
2. Sees the same fields Onboarding Step 1 collected (name, logo, industry, size) — pre-filled with whatever was entered (or left blank if that step was skipped).
3. Edits and saves inline (no separate edit mode) — standard settings-page pattern, not a wizard.
4. If this org still has incomplete Onboarding checklist items, completing this screen checks off "Add your org logo & industry" on that checklist automatically (per [Onboarding Flow B](../02-onboarding/02-user-flow.md)).

## Journey 2 — Setting up Departments & Teams

1. Settings → Departments & Teams tab.
2. Empty state on a fresh org: "No departments yet — group your people to scope reporting and enrollment." with a "Create department" action.
3. Creates a department (e.g., "Sales"), then optionally adds teams inside it (e.g., "Sales — West," "Sales — East").
4. Each department/team is just a container at this point — assigning *people* into them happens in User Management (this module owns the structure, not the membership UI), though the count of members shows here for orientation.
5. Can rename, archive (not hard-delete — orgs with reporting history shouldn't lose department context) a department or team.

## Edge cases

- **Deleting a department that still has teams/members in it:** archiving is the only path (see above) — blocks a destructive action that would orphan user assignments, replaced with a reversible one.
- **Renaming a department that's referenced in existing reports/enrollment rules:** rename propagates everywhere by reference (department is an ID, not a string), so this is safe by construction — worth stating even though it's invisible in the UI, since it rules out ever needing a "rename impact" warning screen.
- **Org with zero departments, indefinitely:** fully supported — a small org may never need this structure; nothing elsewhere breaks if Departments & Teams stays empty forever.

## What this rules in for Step 2 (User Flow)

- General and Departments & Teams are two tabs of one Settings screen, not separate pages — keep them in one flow.
- Archive, not delete, is the only removal path for departments/teams.
- Membership (who's in a department) is explicitly NOT this module's flow — flag the hand-off to User Management clearly so that module doesn't duplicate this screen.
