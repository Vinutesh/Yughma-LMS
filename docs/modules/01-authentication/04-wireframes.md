# Step 4 — Wireframes — Authentication

**Format note:** built as markdown/ASCII layout specs, not Figma — the team's Figma plan is capped at 6 MCP tool calls/month (Starter tier), exhausted building the Cross-Cutting Shell module. See [CLAUDE.md](../../CLAUDE.md). Port these into Figma once the plan is upgraded, or hand directly to the design team as-is.

**Shared layout pattern for all 6 screens:** centered card (~440px), light neutral page background, no shell chrome (nobody's authenticated yet). Card always leads with the Yughma logo/wordmark. On mobile, the card goes full-bleed with page margins instead of floating on a background. Realizes the 5 real screens + 1 shared state from [03-sitemap.md](03-sitemap.md).

---

## 1. Login

```
┌──────────────────────────────────────┐
│                [Logo]                 │
│              Yughma LMS               │
│                                        │
│   Log in                              │
│   ──────────────────────────────────  │
│   Email                               │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│   Password                            │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│                      Forgot password? │
│                                        │
│   ┌──────────────────────────────┐    │
│   │             Log in             │    │
│   └──────────────────────────────┘    │
│                                        │
│   Don't have an account?  Sign up     │
└──────────────────────────────────────┘
```

**Inline states (not separate frames):**
- *Error:* red inline text under the Password field — "Incorrect email or password." Deliberately doesn't say which field is wrong (Journey 5).
- *Lockout:* after repeated failures, the "Log in" button disables and a message replaces the error line — "Too many attempts. Try again in 4:32." (live countdown).
- *Arrived via session-expiry redirect:* a small banner above the card — "Your session ended. Log in to continue." (This is the same content-only difference as the standalone Session Expired screen in the Shell module — reuse that copy/pattern rather than inventing new wording.)

---

## 2. Signup (self-serve org creation)

```
┌──────────────────────────────────────┐
│                [Logo]                 │
│              Yughma LMS               │
│                                        │
│   Create your organization            │
│   ──────────────────────────────────  │
│   Work email                          │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│   Password                            │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│   Organization name                   │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│                                        │
│   ┌──────────────────────────────┐    │
│   │        Create account          │    │
│   └──────────────────────────────┘    │
│                                        │
│   Already have an account?  Log in    │
└──────────────────────────────────────┘
```

**Inline states:**
- *Duplicate email:* red inline text under the email field — "An account already exists for this email." with "Log in" as a clickable link inline, not just a separate nav link — reduces the dead-end (Journey 5).
- *Password field:* live strength/requirement hints below it (length/complexity), not a separate validation screen.
- On success, this hands off straight to the shell (out of scope here) — no "check your email to continue" gate, per the soft-verification decision in [00-open-questions.md](00-open-questions.md).

---

## 3. Accept Invitation

```
┌──────────────────────────────────────┐
│                [Logo]                 │
│                                        │
│   You've been invited to join         │
│   Acme Corp                           │
│   ──────────────────────────────────  │
│   Email                               │
│   ┌──────────────────────────────┐    │
│   │  jamie@acmecorp.com  (locked) │    │
│   └──────────────────────────────┘    │
│   Set a password                      │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│                                        │
│   ┌──────────────────────────────┐    │
│   │      Accept & continue         │    │
│   └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

**Notes:**
- Email field is pre-filled and **read-only** (greyed background, no cursor) — it's the address the invite was sent to, not editable here.
- Org name appears in the heading itself ("join Acme Corp") so the invitee has context before they commit — a bare "Set your password" screen with no org name would feel like a phishing page.
- No separate email-verification step — see [00-open-questions.md](00-open-questions.md).
- *Expired/used link:* doesn't render this form at all — see Screen 6 below.

---

## 4. Forgot Password

```
┌──────────────────────────────────────┐
│                [Logo]                 │
│                                        │
│   Reset your password                 │
│   ──────────────────────────────────  │
│   Enter the email associated with     │
│   your account and we'll send a       │
│   reset link.                         │
│                                        │
│   Email                               │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│                                        │
│   ┌──────────────────────────────┐    │
│   │       Send reset link          │    │
│   └──────────────────────────────┘    │
│                                        │
│              Back to Login            │
└──────────────────────────────────────┘
```

**Inline state — after submit:** the whole card content swaps to a confirmation message (not a new screen):
```
   Check your email
   ──────────────────────────────────
   If an account exists for that
   email, we've sent a link to
   reset your password.

              Back to Login
```
Same message regardless of whether the email exists — prevents using this screen to enumerate valid accounts (Journey 4).

---

## 5. Reset Password

```
┌──────────────────────────────────────┐
│                [Logo]                 │
│                                        │
│   Set a new password                  │
│   ──────────────────────────────────  │
│   New password                        │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│   Confirm new password                │
│   ┌──────────────────────────────┐    │
│   │                                │    │
│   └──────────────────────────────┘    │
│                                        │
│   ┌──────────────────────────────┐    │
│   │        Reset password          │    │
│   └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

On success: redirect to Login with a success banner — "Password updated. Log in with your new password." User is **not** auto-logged-in (Journey 4 — reduces risk if the reset link leaked to someone else).

---

## 6. Expired/Used Link (shared state)

Reused by both Accept Invitation and Reset Password when the token is invalid — same layout, different heading/CTA text.

```
┌──────────────────────────────────────┐
│                [Logo]                 │
│                                        │
│              [icon: expired]          │
│                                        │
│   This link has expired               │
│   ──────────────────────────────────  │
│   Invite links / reset links expire   │
│   after a period, or after being used │
│   once.                               │
│                                        │
│   ┌──────────────────────────────┐    │
│   │  Request a new link            │  │← Reset Password context
│   │  Contact your Org Admin        │  │← Accept Invitation context
│   └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

**Note:** the CTA text branches by context — Reset Password gets a self-serve "Request a new link" (loops back to Forgot Password), while Accept Invitation gets "Contact your Org Admin" (no self-serve path, since only an admin can re-issue an org invite).

---

## What's intentionally not built here

- MFA setup/challenge, SSO redirect, standalone Account Locked screen (it's an inline state on Login, not a screen) — all out of scope per [00-open-questions.md](00-open-questions.md).
- The verify-email banner itself — that lives in the Shell module's content area, not in this module's sitemap.
