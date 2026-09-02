# Open Questions — Roles & Permissions

No new questions — applying the same narrowing pattern as the previous two modules:

- **4 built-in system roles ship fixed:** Learner, Instructor, Manager, Org Admin — matching every role referenced by name across the Shell, Auth, Onboarding, and User Management modules already designed. Their permissions are viewable but not editable (renaming or reshaping what "Instructor" fundamentally means would silently break the mental model every other module assumed).
- **Custom roles are supported**, per the architect note in [MODULES.md](../../MODULES.md) §6 — this is the one piece of "build it in now, it's expensive to retrofit" advice from the original IA pass, so it's in scope even though everything else this round has been narrowed.
- **Assigning a role to a specific user is [User Management](../04-user-management/)'s job, not this module's** — this module only defines which roles *exist* and what each one *can do*.
- **No separate "permission conflict" modal** — instead, a persistent inline warning when editing any role currently assigned to people ("This role is assigned to 12 people — changes apply immediately"), consistent with the inline-state-over-separate-screen pattern used everywhere else so far.
