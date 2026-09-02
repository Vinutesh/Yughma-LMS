# Step 1 — User Journey — Analytics

Persona: **Org Admin** (primary), **Instructor** (Courses tab is relevant to them too, scoped to their own courses).

## Journey 1 — Org Admin reviews trends

1. Manage mode → Organization → Analytics, Org Overview tab by default: active users trend, completions trend, a top-line summary row.
2. Switches to Courses tab: completion/engagement per course, sortable — spots which courses are underperforming.
3. Switches to Learners tab: distribution of progress across the org (e.g., how many are on-track vs. falling behind) — aggregate, not a per-person drill-down (that already exists via Manager Dashboard / User Management for individual cases).

## Journey 2 — Instructor checks their own courses

1. Same Analytics screen, but an Instructor without Org Admin rights only sees the Courses tab, scoped to courses they teach — consistent with the permission-scoped-sections pattern used throughout Manage mode.

## Edge cases

- **Brand-new org with little data:** charts show a real empty/low-data state ("Not enough data yet") rather than a flat, confusing zero-line chart.

## What this rules in for Step 2 (User Flow)

- Tab visibility is permission-scoped, same pattern as everywhere else in Manage mode.
