# Step 1 — User Journey — Full Settings

Persona: **Org Admin**.

## Journey 1 — Branding

1. Org Admin opens Settings → Branding, uploads a logo (via the Content Library picker), and picks an accent color.
2. Sees a small live preview of the shell's top bar with the new logo/color applied — a preview swatch, not yet a global app-wide change.

## Journey 2 — Security

1. Sets a session timeout duration and toggles "Require SSO" — sees a note that SSO enforcement takes effect once an SSO integration is actually connected.

## Journey 3 — Data export & deletion

1. Requests a full data export — sees a confirmation that it's being prepared (mock; no real archive without a backend).
2. If they ever need to delete the organization entirely: types the org's exact name to confirm, sees exactly what that destroys (all users, courses, certificates — a real inventory pulled from the org's own data, not a generic warning), and confirms.

## What this rules in for Step 2 (User Flow)

- Three new Settings tabs: Branding, Security, Data. Org deletion gets its own confirm flow given the stakes.
