# Open Questions — Trial & Plan

No new questions — this module's scope was already set by two earlier decisions:

- **No plan picker at signup** ([Onboarding §00](../02-onboarding/00-open-questions.md)) — every self-serve org auto-starts on a default free trial, no decision forced in the first 30 seconds.
- **No payment collection in this pass** ([ROADMAP.md](../../ROADMAP.md) Phase 1 note) — "plan picker + trial countdown only." Real invoicing/payment methods are Phase 4 Full Billing. Choosing a plan here just records intent; it doesn't charge a card.

So this module is genuinely small: a trial-countdown indicator, a plan-comparison/selection screen, and what happens if a trial ends with nothing chosen.

- **Who can act:** only the Org Admin can choose a plan (it's an org-level, financial-adjacent decision) — other roles see status, not the ability to change it, consistent with the Roles & Permissions model.
