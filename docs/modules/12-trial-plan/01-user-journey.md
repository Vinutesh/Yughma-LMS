# Step 1 — User Journey — Trial & Plan

Persona: **Org Admin** primarily; other roles are read-only observers of trial status.

## Journey 1 — Living inside the trial

1. From signup ([Authentication Journey 1](../01-authentication/01-user-journey.md)) through most of the trial, nothing about this module is visible except a small, unobtrusive trial indicator (e.g., in Settings) — no nagging banners while there's plenty of time left.
2. Once the trial has 7 days or fewer remaining, a dismissible-per-session banner appears in the shell: "X days left in your trial — Choose a plan." Dismissing it hides it for that session, not forever — it reappears next login, since this is genuinely time-sensitive.

## Journey 2 — Choosing a plan

1. Org Admin clicks through (from the banner or Settings) to a plan-comparison screen: a few tiers side by side, with an obvious "Contact sales" path for anything Enterprise-shaped rather than a self-serve tier trying to cover every case.
2. Picks one. No payment form appears — per this pass's scope, it just records the choice and confirms: "You're on the Growth plan — takes effect when your trial ends" (or immediately, if the trial's already over).
3. Other roles never see this screen at all (Roles model) — they'd just see the org's plan reflected passively in Settings if they happen to look.

## Journey 3 — Trial ends with no plan chosen

1. Org Admin sees a blocking screen on next login: "Your trial has ended — choose a plan to continue," with the same plan-comparison screen embedded directly (no separate click-through needed at this point — they're already blocked, don't make them navigate further).
2. Every other role sees a simple, non-blocking message instead: "Your organization's trial has ended. An Org Admin needs to choose a plan to continue." — they're not locked out of a screen they have no power to act on; they're just informed and can still, say, check their profile settings, though core learning content wouldn't be accessible either (a real UX question about how "locked" a non-admin's experience gets is worth a design-review conversation — flagged rather than guessed).

## Edge cases

- **Org with multiple Org Admins, trial ends:** any one of them can choose the plan — not gated to whoever happened to sign up first.
- **Trial banner dismissed right before the deadline, then trial expires:** the blocking screen in Journey 3 still fires regardless of dismissal state — dismissing a warning never suppresses the actual consequence.

## What this rules in for Step 2 (User Flow)

- The plan-comparison screen is one shared component used in three places: proactively from Settings, from the trial-ending banner, and embedded in the trial-expired block — not three different screens.
- Org Admin vs. everyone-else is a hard fork early in this flow.
