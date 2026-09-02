# Step 1 — User Journey — Reports

## Journey 1 — Org Admin/Manager pulls a report

1. Manage mode → Organization → Reports — 3 template cards (Completion, Engagement, Compliance).
2. Picks one, sets filters (date range, department/team — from [Organization Management](../03-organization-management/)'s structure), sees a filtered table.
3. Exports to CSV for anything needing to leave the product (board decks, HR systems).

## Edge cases

- **Filtered report with no matching data:** a real empty state ("No completions in this range") rather than a blank table that looks broken.

## What this rules in for Step 2 (User Flow)

- One shared screen shape (filters → table → export) reused by all 3 templates, not 3 different layouts.
