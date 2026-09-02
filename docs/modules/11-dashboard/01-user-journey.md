# Step 1 — User Journey — Dashboard

Each dashboard answers a different question for a different persona — the core premise from [MODULES.md](../../MODULES.md) §3.

## Journey 1 — Learner: "What should I do next?"

Already fully designed as Shell's Home screen (Continue Learning, This Week stats, Recent Activity) — see [Shell wireframes](../00-cross-cutting-shell/04-wireframes.md). No new journey here; noted for completeness of the Dashboard module's full picture.

## Journey 2 — Instructor: "What needs my attention?"

1. Switches to Manage mode, lands on the Dashboard (the refined default from [00-open-questions.md](00-open-questions.md)) instead of straight into Courses.
2. Sees, at a glance: ungraded submissions count (pulls from [Assignments](../09-assignments/)), courses with low engagement (e.g., "12 learners haven't started Sales Fundamentals"), and a short list of the most recent submissions.
3. Each item is a direct link — clicking an ungraded count goes straight to that assignment's submission queue, not just to a generic Assignments list.

## Journey 3 — Manager: "How is my team doing?"

1. Manage mode, Team section, lands on a dashboard (not a bare list) — team-wide completion rate, and specifically who's overdue on required courses (the compliance angle that matters most for a corporate buyer).
2. Can drill into an individual report's progress — this links out to a per-person progress view (a lightweight extension of what already exists in Course detail's progress tracking, viewed on someone else's behalf, not a new module of its own).

## Journey 4 — Org Admin: "Is the org healthy, and is setup finished?"

1. Manage mode, Organization section, lands on a dashboard combining two things: org-wide stats (active users, completions this month) and — if applicable — the Onboarding checklist widget (only shown if setup items remain, per [Onboarding Flow B](../02-onboarding/02-user-flow.md)).
2. Quick links into Users, Roles, Settings for common admin actions, rather than requiring the sidebar for everything.

## Edge cases

- **Brand-new org, nothing has happened yet:** Instructor/Manager/Org Admin dashboards all need real empty states ("No submissions yet," "No team members assigned yet") rather than showing zeros that look broken.
- **Someone with multiple Manage-mode roles (e.g., Instructor + Org Admin):** sees one combined dashboard reflecting all their permitted sections' summaries stacked, not forced to pick which dashboard to view — consistent with the Shell's existing "sections stack, not exclusive tabs" decision for multi-role accounts.

## What this rules in for Step 2 (User Flow)

- Manage mode's landing flow needs updating: default lands on Dashboard, not the first section's list screen.
- Every summary metric on every dashboard needs to be a real link to where the detail lives, not a static number.
- Empty states are a first-class concern here, not an afterthought — a brand-new org's dashboards are a real, common state, not an edge case to skip.
