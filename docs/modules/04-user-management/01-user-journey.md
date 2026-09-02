# Step 1 — User Journey — User Management

Persona: **Org Admin**, in Manage mode → Organization → Users.

## Journey 1 — Inviting people

1. Opens Users, clicks "Invite people."
2. Same multi-email chip input pattern as Onboarding Step 3 — enters one or more emails, each defaulting to Learner role, with an inline role dropdown per email for anyone who needs a different starting role (e.g., inviting a fellow admin directly).
3. Optionally assigns them all to a department/team in the same modal (a dropdown sourced from Organization Management's structure) — saves a second trip to set that up per person right after inviting.
4. Sends. Each invitee gets the email from [Authentication Journey 2](../01-authentication/01-user-journey.md) (Accept Invitation flow) — this module triggers that flow, doesn't duplicate it.

## Journey 2 — Managing an existing user

1. Opens Users, finds someone via search/filter (by name/email, department, role, status).
2. Clicks a row, opens a detail panel (not a full-page navigation — keeps the list in context behind it).
3. From here: change their role (dropdown of existing roles — not building a new one), change their department/team, deactivate them, or (if permitted) impersonate them for support purposes.

## Journey 3 — Deactivating someone

1. From the detail panel, "Deactivate."
2. Confirm dialog explains the effect plainly: they lose access immediately, their history (completions, certificates, submissions) is preserved, and they can be reactivated later — deactivation is a status flip, not a delete.
3. Deactivated users move to a filtered view (a tab/filter on the same list, not a separate screen) rather than disappearing — an admin should be able to find and reactivate someone without hunting.

## Journey 4 — Impersonation (support)

1. From the detail panel, "Log in as [user]" — visible only to accounts with that specific permission (not every Org Admin necessarily; this is exactly the kind of fine-grained permission that motivated the custom-role decision in [MODULES.md](../../MODULES.md) §6).
2. Enters the product as that user, with a persistent, impossible-to-miss banner: "Viewing as Priya Sharma — Exit" pinned to the top of the shell.
3. Every action taken while impersonating is attributed to the impersonating admin in the audit log (Audit Logs module, out of scope here) — not silently attributed to the impersonated user.
4. "Exit" returns them to their own admin session, exactly where they left off.

## Edge cases

- **Inviting an email that's already a user in this org:** inline message on that chip — "Already a member" — rather than silently sending a duplicate invite.
- **Deactivating the org's only remaining Org Admin:** blocked with an explicit message — "This is the only Org Admin. Assign another admin first." — an org that accidentally locks itself out is a support nightmare.
- **Impersonating while the impersonated user is also logged in elsewhere:** out of scope for this design pass (a real concurrency edge case) — flagged here so it isn't forgotten when this module gets built.

## What this rules in for Step 2 (User Flow)

- Invite is one flow that optionally sets role + department/team together, not three separate steps.
- Deactivate/reactivate is a status toggle reflected as a list filter, never a deletion.
- Impersonation needs its own always-visible exit affordance — it's not just "logging in as," it's a mode the admin must never lose track of being in.
