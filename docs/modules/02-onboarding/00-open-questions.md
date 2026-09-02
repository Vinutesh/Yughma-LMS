# Open Questions — Onboarding

No question rose to the level of needing to stop and ask this round — the calls below are all easily reversible (add a screen/step later without restructuring anything), so applying sensible defaults and stating them here for visibility, per the working pattern established in [Authentication](../01-authentication/00-open-questions.md).

## Defaults applied

- **Who goes through Onboarding at all:** only the person who just self-serve-signed-up (the new org's first Org Admin) — see [Authentication Journey 1](../01-authentication/01-user-journey.md). **Invited users never see this wizard** — the org already exists and is already set up by the time they join, so they land straight in the shell (Shell Journey 1). This module is entirely about first-run org setup, not general new-user onboarding.
- **No plan/trial-picker screen in v1.** Every self-serve org auto-starts on a default free trial with no explicit selection step — one less decision to force on someone who just signed up 30 seconds ago. A real plan/upgrade picker is a separate, later concern (Billing, [ROADMAP.md](../../ROADMAP.md) Phase 4) triggered when a trial is ending, not part of first-run onboarding.
- **4-step wizard, each step skippable individually** (not just abandonable as a whole) — directly implementing the architect note in [MODULES.md](../../MODULES.md) §2 that this must be skippable but persistent as a dismissible checklist, not a blocking wizard:
  1. Org basics (name, logo, industry, size)
  2. What you're using Yughma for (role/persona — tailors sample content language, e.g. "Training team" vs. "L&D for a large org")
  3. Invite your team (multi-email input)
  4. You're set — confirms a sample course was seeded, hands off to the shell
- **Sample/starter course seeding is automatic, not a user-facing step** — it happens silently in the background once Org Basics is submitted, and is simply *mentioned* on the final step ("We've added a sample course so you can see how it works") rather than requiring a decision.
