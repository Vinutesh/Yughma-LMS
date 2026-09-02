# Open Questions — Authentication

## Q1. Login identifier
Email vs. a separate username field.

**Answer: Email.** Standard for B2B SaaS, doubles as the invite/contact channel, no separate uniqueness/collision handling needed. Login screen is Email + Password.

## Defaults applied without a separate question (stated here so they're visible, not silently assumed)

- **MFA: out of scope for v1.** Explicit instruction — "simple username and password." No MFA setup/challenge screens in this pass.
- **SSO/SAML: out of scope for v1 UI.** No "Continue with SSO" button on the login screen — keeping it simple per instruction. Architect note carried into wireframes: the login form should still be built so an SSO option can be added later without restructuring the screen (e.g., don't hardcode the form as the only possible auth path in the backend contract), but nothing about that shows up visually now.
- **Email verification differs by signup path:**
  - **Invited users:** no separate verification step. Clicking the invite link *is* the verification — the org admin already vouched for the address by inviting it.
  - **Self-serve signups:** verification required before full access (standard anti-abuse pattern for public signup). Soft-gated: they can log in and see the shell/onboarding immediately, but a persistent banner nags until verified, and verification is required before certain actions (inviting others, starting a paid trial commitment).
- **Account lockout:** simple, generic — after repeated failed attempts, show a temporary-lockout message with a retry countdown. No CAPTCHA/step-up flow in this pass.
- **Password requirements:** standard strength rules (length + complexity), surfaced as inline validation on the password field. Not a separate screen.

These defaults follow directly from "keep it simple" — anything more (MFA, SSO, CAPTCHA) is easy to layer on later without changing the screens designed here.
