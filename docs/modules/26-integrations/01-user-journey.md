# Step 1 — User Journey — Integrations

Persona: **Org Admin**.

## Journey 1 — Browsing and connecting

1. Org Admin opens the Integrations directory — a grid of cards (SSO, Slack, Teams, Zoom, Calendar Sync, HRIS), each showing connected/not-connected.
2. Clicks "Connect" on Slack. Sees the standard "you'll be redirected to authorize with Slack" confirmation, confirms, and lands back with the card now showing "Connected" (mocked — no real OAuth round-trip).
3. Opens the connected integration's config panel — a small set of key-value settings (e.g., "Notify this channel on course completions").

## Journey 2 — Webhooks

1. Org Admin adds a webhook: a URL, a name, and which event types to send (Course published, Certificate issued, Enrollment completed...).
2. Gets a signing secret shown once, for verifying payloads later.
3. Can view a (mock) delivery log per webhook and disable/delete it.

## Journey 3 — API keys

1. Org Admin generates an API key, names it ("Zapier integration"), and sees the full key value exactly once.
2. Later sees it in the list only as a masked value + last-used date, and can revoke it.

## What this rules in for Step 2 (User Flow)

- One directory grid, one generic config panel pattern reused per integration, one Webhooks screen, one API Keys screen — four screens total, not one per integration.
