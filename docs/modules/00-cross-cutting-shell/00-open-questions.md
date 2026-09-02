# Open Questions — Cross-Cutting Shell

These are foundational: they cascade into every screen in every future module, so they're resolved before Step 1 (User Journey) is written.

## Q1. Primary navigation model
Where does module navigation live?
- **A — Left sidebar primary** (Linear/Notion/Slack): persistent collapsible sidebar holds all module nav; top bar is thin (search/notifications/profile).
- **B — Top nav primary** (classic SaaS/GitHub-style): horizontal nav bar across the top; no left sidebar.
- **C — Hybrid** (Stripe/Vercel dashboard): top bar carries org switcher + search + notifications + profile; left sidebar carries module nav.

## Q2. Multi-role navigation
A single person can hold multiple roles (e.g., an Instructor who is also enrolled as a Learner; an Org Admin who also takes courses). How does the shell handle that?
- **A — Unified nav, permission-scoped sections:** one sidebar; sections/items appear based on what the user is allowed to do (e.g., an "Admin" section appears below the learner items).
- **B — Mode switch:** a Learner mode and an Admin/Manage mode, switched explicitly (like Slack workspace vs. admin console) — different nav entirely per mode.

## Q3. Org switcher — needed in v1?
- **A — Not in v1:** assume one org per user account for now; keep the data model open but skip the switcher UI.
- **B — Needed in v1:** users (e.g., consultants, contractors) can belong to multiple orgs and need to switch.

## Q4. Branding/white-label in the shell — v1 or Phase 4?
- **A — Default Yughma theme only in v1**, per-org branding (logo/accent color swap) is a Phase 4 Settings addition.
- **B — Per-org branding is part of this pass:** sidebar/top bar must support a swapped logo and accent color from day one.

## Answers

- **Q1 — Nav model:** C, Hybrid. Top bar: org name/context, search, notifications, profile menu. Left sidebar: module nav.
- **Q2 — Multi-role nav:** Explicit mode switch — **Learning** mode vs. **Manage** mode. Implication worked out below.
- **Q3 — Org switcher:** Not in v1. Top bar shows the org name as a static label, not a switcher control.
- **Q4 — Branding:** Fixed Yughma theme (light/dark) only. No per-org logo/accent swap in this pass.

### Working out the mode-switch model (Q2)

Roles in play: Learner (base role, everyone has it), Instructor, Manager/Team-Lead, Org Admin. Super Admin (platform/Yughma-internal) is out of scope here entirely — that's an internal ops tool, not part of the customer-facing shell.

- A user who **only** has the Learner role never sees a mode switch at all — just the Learner sidebar, full stop. Don't show a switch control with nothing to switch to; that violates the minimal/no-clutter design philosophy.
- A user who holds **Instructor and/or Manager and/or Org Admin** (in addition to the implicit Learner role) gets a two-state switch: **Learning** / **Manage**.
  - **Learning mode:** the standard Learner nav (Home, Courses, Paths, Certificates, etc.) — identical regardless of what other roles the person holds.
  - **Manage mode:** one sidebar, but sections inside it are permission-scoped (this is where the earlier "unified nav, permission-scoped sections" idea still applies, just nested one level down) — e.g. a Course-authoring section appears if they're an Instructor, a Team/Reports section if they're a Manager, an Org/Users/Roles/Settings section if they're an Org Admin. A person with more than one of these roles simply sees more sections stacked in Manage mode, not a third mode.
- The switch control lives in the sidebar header (below the logo, above nav items) — see Step 4 for exact placement.
