# Step 1 — User Journey — Audit Logs

## Journey 1 — Org Admin investigates or reviews

1. Manage mode → Organization → Audit Log — a chronological table: timestamp, actor, action, target.
2. Filters by actor, action type, or date range (e.g., "show me everything Priya did last week," or "every role change in the last 30 days").
3. Clicks an entry → detail drawer with the full context (what changed, from what value to what, and — for impersonation entries — both the impersonating admin and the impersonated user).
4. Exports to CSV for compliance/audit purposes outside the product.

## Edge cases

- **Filtered log with no matches:** real empty state, same pattern as Reports.

## What this rules in for Step 2 (User Flow)

- Detail drawer, not a separate page — keeps the log list in context, same interaction pattern as User Management's detail panel.
