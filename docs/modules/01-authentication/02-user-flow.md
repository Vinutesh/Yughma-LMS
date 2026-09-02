# Step 2 — User Flow — Authentication

Turns [01-user-journey.md](01-user-journey.md) into concrete flows.

## Flow A — Self-serve signup

```mermaid
flowchart TD
    A[Signup screen: email, password, org name] --> B{Email already has an account?}
    B -- Yes --> C[Inline message: 'An account already exists for this email' + link to Login]
    B -- No --> D[Create account + org, log in immediately]
    D --> E[Hand off to shell — Learning mode, Home<br/>verify-email banner visible, non-blocking]
    E --> F[Hand off to Onboarding module]
```

## Flow B — Invited user accepts

```mermaid
flowchart TD
    A[User clicks invite link from email] --> B{Link valid?}
    B -- Expired/already used --> C[Accept Invitation screen shows expired/used state<br/>+ 'Contact your Org Admin for a new invite']
    B -- Valid --> D[Accept Invitation screen<br/>email pre-filled read-only, org name shown]
    D --> E[User sets password, submits]
    E --> F[Account activated, logged in immediately<br/>no separate email verification]
    F --> G[Hand off to shell — Learning mode, Home]
```

## Flow C — Returning user login

```mermaid
flowchart TD
    A[Login screen: email + password] --> B{Credentials valid?}
    B -- No --> C[Inline error: 'Incorrect email or password']
    C --> D{Too many recent failures?}
    D -- Yes --> E[Temporary lockout message + retry countdown]
    D -- No --> A
    B -- Yes --> F{Arrived here via session-expiry redirect?}
    F -- Yes --> G[Return to exact prior screen — Shell Flow F]
    F -- No --> H[Hand off to shell, restore last-used mode/position — Shell Flow A]
```

## Flow D — Forgot / reset password

```mermaid
flowchart TD
    A[Login: 'Forgot password?'] --> B[Enter email]
    B --> C[Generic confirmation shown regardless of whether email exists:<br/>'If an account exists, we've sent a reset link']
    C --> D{User clicks emailed link}
    D -- Expired/already used --> E[Reset Password screen shows expired/used state<br/>+ option to request a new link]
    D -- Valid --> F[Reset Password screen: new password + confirm]
    F --> G[Password updated]
    G --> H[Redirect to Login with success message<br/>NOT auto-logged-in — must log in fresh]
```

## Notes carried into Step 3 (Sitemap)

- Signup and Accept-Invitation are separate screens with separate entry points, both converging on the same shell hand-off.
- Expired/used-token handling is one shared visual pattern, reused by both the invite link and the reset link — not two different designs.
- The lockout state lives inside the Login flow, not as a separate screen — it's an inline state change on Login itself.
