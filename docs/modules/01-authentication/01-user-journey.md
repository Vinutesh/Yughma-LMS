# Step 1 — User Journey — Authentication

Decisions this builds on: [00-open-questions.md](00-open-questions.md) — email as identifier, no MFA/SSO in v1, split verification rules by signup path.

## Personas in scope

- **Prospect** — someone signing up self-serve to create a brand-new org (becomes that org's first Org Admin).
- **Invited user** — added by an existing Org Admin; can land as Learner, Instructor, Manager, or Org Admin depending on what they were invited as.
- **Returning user** — anyone logging back in.

## Journey 1 — Self-serve signup (Prospect)

1. Arrives at a public signup screen (from marketing site, not designed here).
2. Enters email, password, org name — that's it. No credit card, no plan selection yet (plan/trial picker is a separate Billing-lite concern per [ROADMAP.md](../../ROADMAP.md) Phase 1 — Auth just needs to hand off into it after account creation).
3. Account + org created immediately; they're logged in right away — no waiting on email verification to get in the door.
4. Lands in the shell, in Learning mode, on Home — per the Shell module's Journey 1, even though they're about to become an Org Admin. A "verify your email" banner is visible but non-blocking.
5. Onboarding module (separate, not designed here) picks up from here to walk them through org setup.

## Journey 2 — Invited user accepts an invitation

1. Receives an email with an invite link (email sending itself is backend, out of scope).
2. Clicks the link → lands on Accept Invitation screen, pre-filled with their email (read-only — it's the address the invite went to) and org name shown for context ("You've been invited to join Acme Corp").
3. Sets a password. Submits.
4. No separate email-verification step — accepting the invite via the emailed link already proves ownership of that address.
5. Lands directly in the shell (Learning mode, Home) — same landing point as any first login, per Shell Journey 1.

## Journey 3 — Returning user logs in

1. Arrives at Login screen (either by navigating directly, or redirected here after a session expired — see Shell Flow F).
2. Enters email + password.
3. Success → shell, restoring last-used mode/position per Shell Flow A.
4. If this login was triggered by a session expiry mid-task, success returns them to exactly where they were (Shell Flow F), not to Home.

## Journey 4 — Forgot password

1. From Login, clicks "Forgot password?"
2. Enters email on a dedicated screen.
3. Generic confirmation shown regardless of whether that email exists in the system ("If an account exists for this email, we've sent a reset link") — prevents using this screen to enumerate valid accounts.
4. Clicks emailed link → Reset Password screen → sets new password → redirected to Login with a success message, must log in fresh with the new password (not auto-logged-in — reduces risk if the reset link leaked).

## Journey 5 — Edge cases

- **Wrong password, repeated attempts:** inline error each time ("Incorrect email or password" — deliberately not specifying which field is wrong, to avoid confirming an email exists). After several failures, temporary lockout message with a retry countdown.
- **Invite link expired or already used:** Accept Invitation screen shows an explicit expired/used state with a "Contact your Org Admin to request a new invite" message, not a generic error.
- **Self-serve signup with an email that already belongs to an existing org's account:** rather than silently failing, tell them an account already exists and point at Login — a locked-out prospect who can't tell why they can't sign up is a lost prospect.
- **Password reset link expired or already used:** same pattern as expired invite — explicit state, not a generic error, with a way to request a new one.

## What this rules in for Step 2 (User Flow)

- Signup and Invite-Accept are genuinely separate flows that both terminate at the same place (shell, Learning mode, Home) — don't merge them into one screen.
- The "email exists" ambiguity needs consistent handling across Login, Forgot Password, and Signup so none of them leak whether an email is registered, except the one deliberate exception (signup blocking a duplicate email, which is a defensible UX trade-off since silently failing there is worse).
- Expired/used-token states (invite link, reset link) are a shared pattern, not two different one-offs.
