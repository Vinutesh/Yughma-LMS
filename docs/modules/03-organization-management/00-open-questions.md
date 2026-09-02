# Open Questions — Organization Management

No new questions this round — scope here is already constrained by decisions made earlier ([CLAUDE.md](../../CLAUDE.md), Shell and Onboarding modules), so this module is narrower than [MODULES.md](../../MODULES.md) §4 originally sketched:

- **Org hierarchy is fixed at 2 levels for v1 UI** (Department → Team) even though the data model is generic — so this module needs a Departments & Teams manager, not a full arbitrary-depth tree builder.
- **No branding/white-label screen in v1** — the shell renders a fixed Yughma theme; a future Phase 4 Settings pass adds logo/color customization. This module still owns the org's *logo* as plain metadata (shown in the top bar per Shell wireframes) — that's data capture, not a theming feature.
- **No sub-org/franchise/multi-branch management in v1** — single flat org per tenant. Revisit if a coaching-institute-style customer needs it.
- **No Yughma-internal "org list" screen here** — that's an internal ops tool for Yughma staff, out of scope for the customer-facing design (same reasoning as excluding Super Admin from the Shell module).
- **Where this lives in the nav:** the Shell module's Manage-mode sidebar (already wireframed) has an "Organization" section with Users / Roles / Settings. This module's screens live under **Settings** — specifically, Settings gets a General tab (org profile — the same fields Onboarding Step 1 collects) and a Departments & Teams tab. Not adding a 4th sidebar item, to stay consistent with the already-approved Shell wireframes.
