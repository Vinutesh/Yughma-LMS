# Step 1 — User Journey — Full Billing

Persona: **Org Admin**.

## Journey 1 — Once on a paid plan

1. After choosing a plan (Trial & Plan), the org eventually leaves trial and the plan takes effect. Settings → Plan now shows a fuller Billing tab: current plan, seats used/limit, next invoice date, payment method on file.
2. The Org Admin can view invoice history at any time — a simple list, newest first, each with a status (Paid / Open).
3. The Org Admin can update the payment method on file.

## Journey 2 — Needing more seats

1. The org approaches its plan's seat limit (visible as a simple used/limit indicator, matching the pattern already used elsewhere for department/team counts).
2. Org Admin requests additional seats from the Billing tab — this records an intent (a pending seat-increase request) rather than instantly changing anything, since real proration requires a real payment processor.

## Journey 3 — Subscription lifecycle

1. If a (mock) payment fails, the subscription status becomes "Past due" — shown as a clear banner, same visual family as the Trial & Plan ending-soon banner, since it's the same "something needs Org Admin attention" pattern.
2. The Org Admin can cancel — this doesn't delete the org, it schedules the plan to lapse at the end of the current billing period, mirroring how choosing a plan during trial "takes effect when the trial ends" rather than immediately.

## What this rules in for Step 2 (User Flow)

- One Billing tab (inside Settings, alongside the existing Plan flow) covering: current plan/seats, payment method, invoice history, cancel.
- Past-due and canceled are visible states, not separate screens.
