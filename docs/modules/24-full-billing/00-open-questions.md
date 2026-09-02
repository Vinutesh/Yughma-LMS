# Open Questions — Full Billing

Scope narrowed the same way every prior module was — real screens, honest about what's mocked:

- **No real payment processor integration.** There is still no backend (see [SECURITY_REVIEW.md](../../SECURITY_REVIEW.md) and the backend plan) — this module builds the complete UI for subscription management, invoice history, payment methods, and seat/usage add-ons, all backed by mock data, with the exact seams where a real Stripe (or equivalent) integration plugs in clearly marked. This is consistent with how Trial & Plan (Phase 1) was built: real UI, recorded intent, no card ever charged.
- **Builds directly on Trial & Plan's `PlanId`/`Organization.plan` fields** — Full Billing doesn't replace that model, it completes it: a real subscription lifecycle (active/past-due/canceled), invoice records, a stored (mock) payment method, and seat usage against the plan's seat limit.
- **Seat/usage add-ons** = the org can see how many active users they have against their plan's seat limit, and request more seats — recorded as an intent, not a real proration/charge.
- **Invoice history is read-only and generated from plan-change events** — no manual invoice creation, no editing.
- **Payment method is a single stored card-shaped record** (mock — a real integration would tokenize this with Stripe Elements or similar and never see the raw card number; the mock stores only a brand + last4 shape, deliberately never a real PAN, to keep the eventual swap honest about what "payment method on file" means).
- **Org Admin only**, same tier as Plan (Trial & Plan) and Settings — a financial-adjacent decision.
