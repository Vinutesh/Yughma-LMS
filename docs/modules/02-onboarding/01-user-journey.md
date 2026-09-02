# Step 1 — User Journey — Onboarding

Builds on [00-open-questions.md](00-open-questions.md). Single persona: the **new Org Admin**, arriving straight from self-serve signup ([Authentication Journey 1](../01-authentication/01-user-journey.md)).

## Journey — First-run org setup

1. Immediately after signup, instead of a bare Home screen, the wizard opens on top of (or in place of) the shell — Step 1: **Org basics**. Name is pre-filled from what they typed at signup if applicable; logo, industry, and size are optional/quick-pick fields.
2. **Step 2 — What you're using Yughma for.** A handful of persona chips (e.g. "Onboard new hires," "Upskill my team," "Sell training to clients"). This isn't just decoration — it's the one input this wizard has to tailor anything (which sample course gets seeded, what language the checklist uses later).
3. **Step 3 — Invite your team.** A multi-email input, add-as-many-as-you-want, each with a role pre-set to Learner (changeable later — this isn't the place for a full Roles editor). Clearly optional — a visible "Skip for now" alongside "Send invites."
4. **Step 4 — You're set.** Confirms: a sample course has been added, invites (if any) are on their way, and a checklist widget will track anything left. Single "Go to my Home" action.
5. Lands in the shell, Learning mode, Home — same landing point as any other first login (Shell Journey 1) — with the checklist widget visible and unfinished items (e.g., "Invite your team" if skipped) still there to pick up later.

## Journey — Abandoning mid-wizard

1. At any step, "Skip for now" (per-step) or closing the wizard entirely drops them straight into the shell.
2. Nothing done so far is lost — org basics already submitted stay submitted; only remaining steps become checklist items.
3. The checklist widget (on the Org Admin's Home/Dashboard, not designed in depth here — it's a Dashboard-module component) lists exactly the steps that weren't finished, each re-openable individually. It's dismissible entirely, not just per-item, for an admin who genuinely doesn't want the nudge.

## Edge cases

- **Every step skipped:** they land on a completely stock Home with an empty org (just themselves) and a full checklist. Not an error state — a legitimate, supported path for someone who wants to explore before committing to anything.
- **Invites sent but some emails invalid/malformed:** inline validation on the email input itself (same pattern as any multi-value input), not a failure after submission.
- **Someone re-triggers "Org basics" from the checklist after already having explored the product for a while:** the step should feel like editing existing settings, not restarting a wizard from scratch — it's really just a shortcut into Organization Management's own settings screens for those specific fields, not a separate onboarding-only data store.

## What this rules in for Step 2 (User Flow)

- Each step needs its own skip action, not just one wizard-level "skip all."
- The checklist widget is the connective tissue between "skipped in the wizard" and "still needs doing" — flows need to show both the skip-path and the resume-from-checklist path landing on the same underlying step.
- Re-opening a completed step later (e.g., editing org basics) should route into Organization Management, not a special onboarding-only edit mode.
