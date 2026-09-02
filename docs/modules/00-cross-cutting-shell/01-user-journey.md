# Step 1 — User Journey — Cross-Cutting Shell

Decisions this builds on: [00-open-questions.md](00-open-questions.md) — hybrid top bar + sidebar, explicit Learning/Manage mode switch, no org switcher in v1, fixed theme in v1.

## Personas in scope

- **Learner** — the base role; every account has at least this.
- **Instructor** — authors/manages courses. Also a Learner elsewhere in the org, typically.
- **Manager/Team-Lead** — oversees a team's progress. Also usually a Learner.
- **Org Admin** — manages the org itself (users, roles, org settings). Also usually a Learner.
- **Super Admin** — explicitly **out of scope** for this shell; that's a separate, Yughma-internal tool, not part of the customer-facing product.

A given account can combine any of Instructor / Manager / Org Admin on top of the base Learner role — that combination is exactly what the Manage-mode section-visibility rules (defined in the open questions) exist to handle.

## Journey 1 — First login (any persona)

1. User arrives via an email invite link or a self-serve signup flow (Auth module — out of scope here, but it hands off into the shell once authenticated).
2. First thing rendered post-auth: the shell, in **Learning mode**, on the Learner Dashboard (Home). This is true even for an Org Admin's very first login — you land as a learner, not in an admin console, because the product's default posture is "this is a learning tool first."
3. If the account holds Instructor/Manager/Org Admin rights, the mode switch is visible in the sidebar from the very first session — no onboarding gate hides it.
4. Sidebar shows only the nav items the account has permission for. No disabled/greyed-out items for things they can't access — absence, not a locked padlock, communicates permission scope. (Locked icons imply "upgrade me," which is the wrong signal for a permission boundary.)

## Journey 2 — Returning learner, daily use

1. Opens the app, lands on Home (Learner mode, last-used mode is remembered — see Journey 4).
2. Uses the sidebar to get to Courses / Paths / Certificates.
3. Checks the notification bell for grading results, deadline reminders, new assignments.
4. Uses global search (command palette) to jump straight to a specific course or lesson rather than clicking through the sidebar — this matters once a learner is enrolled in a dozen+ courses.
5. Opens the profile menu to reach personal Settings (dark mode, notification preferences) or to log out.

## Journey 3 — Instructor switching into Manage mode

1. Currently in Learning mode (say, taking a compliance course).
2. Uses the mode switch control in the sidebar header to move to Manage mode.
3. Sidebar content changes entirely: now shows the Course-authoring section (their permission scope). If they're *only* an Instructor (no Manager/Org Admin rights), that's the only section in Manage mode.
4. Grades a submission, then switches back to Learning mode to finish their own course.
5. **Key requirement surfacing from this:** switching modes must not lose their place — if they were mid-lesson in Learning mode, returning to Learning mode should return them to where they left off, not force them back to Home. (Carried into Step 2 as a flow requirement.)

## Journey 4 — Org Admin, multi-role

1. Holds Learner + Manager + Org Admin.
2. Default landing mode is whichever mode they were in during their last session (not always Learning) — an Org Admin who lives in Manage mode all day shouldn't be dumped into Learning mode every morning.
3. In Manage mode, sees both a Team/Reports section (Manager permissions) and an Org/Users/Roles/Settings section (Org Admin permissions) stacked in the same sidebar — no need to pick "which admin am I today."
4. Top bar org name is a static label (no switcher, per Q3) — reassures them which org's data they're looking at, without implying they can hop to another one.

## Journey 5 — Session, error, and edge states

- **Session expiry mid-task:** shell must preserve unsaved context where feasible (e.g., a draft in a form) and route to a Session Expired screen that returns the user to exactly where they were after re-auth, not to Home.
- **Permission edge case:** a Manager loses their Manager role while mid-session (role changed by an Org Admin elsewhere) — next navigation action should gracefully drop the now-unavailable section rather than crash or show stale data. Surfaces a requirement for permission checks on navigation, not just at login.
- **Offline/connectivity loss:** shell shows a persistent, non-blocking offline banner; does not hard-fail the whole app.
- **404 inside a module:** shell frame stays intact (sidebar/top bar still render); only the content area shows the 404, so the user isn't stranded without navigation.
- **Empty notifications / empty search:** each gets its own designed empty state (Step 4+), not a blank panel.

## What this rules in for Step 2 (User Flow)

- A mode-switch flow with "return to last position" behavior, not just "return to Home."
- A single Session Expired recovery flow used app-wide.
- A permission re-check on navigation, not only at login/page load.
- Search/command palette as a first-class flow, not a peripheral feature.
