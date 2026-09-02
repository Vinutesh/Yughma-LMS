# Open Questions — Integrations

Per [MODULES.md](../../MODULES.md) §30's architect note: build one generic integration framework, not a bespoke page per integration. This pass builds that framework's UI shell with mock connection states.

- **One directory/marketplace screen listing every integration** (SSO, Slack, Teams, Zoom, calendar sync, HRIS) with a uniform card shape — name, description, status (Not connected / Connected), one action button. The 10th integration should cost a data-row, not a new page, per the architect note.
- **"Connect" is an OAuth-shaped flow with no real OAuth behind it** — clicking Connect shows the standard "you'll be redirected to authorize..." pattern, then simulates a successful connection (recorded state), since there's no real backend to hold a token. This keeps the interaction pattern correct for when real OAuth lands.
- **Per-integration config is a generic key-value settings panel** once connected (e.g., which Slack channel gets notifications) — not a bespoke UI per integration, matching the "one framework" mandate.
- **Webhooks management is real UI, mock delivery** — an org can register a webhook URL + pick event types (course.completed, certificate.issued, etc. — reusing the same categories notifications already use), see a (mock) delivery log, and get a signing secret. No real HTTP delivery happens without a backend.
- **API key management is real UI, mock keys** — generate/name/revoke keys, shown once on creation (standard pattern), with a last-used timestamp that's mocked. This is genuinely useful scaffolding for the day the backend actually issues real keys.
- **Org Admin only** — same tier as Settings; connecting company-wide integrations is an org-level decision, not an individual one.
