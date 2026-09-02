# Open Questions — Audit Logs

No blocking questions.

- **Small by nature** — [MODULES.md](../../MODULES.md) §27 flags this S–M complexity and recommends it consume the same event bus as [Notifications](../19-notifications/) rather than a second logging pipeline. That's a backend/architecture note more than a screen-design one; this pass just needs the viewer.
- **Org Admin only** — audit logs are a compliance/security surface, not a general admin convenience; scoped to the same permission tier as Roles & Permissions management.
- **Impersonation actions are logged here too** — directly closes the loop from [User Management](../04-user-management/)'s impersonation feature ("every action taken while impersonating is attributed to the impersonating admin in the audit log").
