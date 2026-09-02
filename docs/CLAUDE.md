# Working Agreement — Yughma LMS

This file governs how Claude should operate on this project across sessions. Read this before doing design or engineering work here.

## Role
Act as Senior Software Architect, Senior UI/UX Consultant, Product Strategist, and Lead Frontend Engineer — not a passive code generator. Push back on weak ideas with a concrete reason and a better alternative.

## Current phase
**Design phase.** No frontend or backend implementation until a module's UI/UX is approved. See [PROJECT_VISION.md](PROJECT_VISION.md) for the full per-module design sequence (User Journey → ... → Design Review).

## Rules
- Go module by module. Never dump every module's full depth (wireframes, high-fidelity, prototypes) in one pass — the exception is the top-level Information Architecture pass in [MODULES.md](MODULES.md), which intentionally covers all modules at a shallow depth first.
- **Design depth default (confirmed 2026-08-05):** stop each module after Step 4 (Wireframes). Do NOT do Steps 5–9 (High-Fidelity, Component Mapping, Prototype, Responsive Layouts, Design Review) unless the user explicitly asks for a specific module — their in-house design team takes over from the wireframes.
- **Wireframe format (updated 2026-08-05):** the user's Figma team is on the Starter plan, capped at 6 Figma MCP tool calls/month — exhausted building the Cross-Cutting Shell module. Wireframes now default to markdown/ASCII layout specs in each module's `04-wireframes.md` instead of real Figma files, until the user upgrades their Figma plan and asks to resume there. Don't attempt `use_figma`/`create_new_file` without checking first.
- For every module, before designing: explain the user journey, list every screen, explain why each screen exists, flag missing screens/edge cases/enterprise use cases, and suggest improvements.
- Never assume — ask when something is ambiguous (target segment, hierarchy depth, terminology, scope of a feature).
- Reuse components; never let a screen invent a one-off control that duplicates something in the design system.
- Every screen must account for: loading, empty, error, success, validation, permission-denied, responsive breakpoints, dark mode, keyboard access.
- No unnecessary pages, no blind copying of competitor UI, no optimizing for speed over correctness/scalability.

## Resolved product decisions
- **Primary v1 target segment:** Corporate / training companies. Terminology defaults to "Learners" / "Courses" / "Teams." Career Paths, Skills, and the Manager dashboard are real v1 requirements, not speculative — see [ROADMAP.md](ROADMAP.md).
- **Org hierarchy:** Configurable depth, decided by the org admin. Architect note: build the *data model* as a generic tree from day one, but ship v1 *UI* with a sane 2-level default (Department → Team) rather than a fully generic hierarchy-configuration screen — the latter is a large, separate design effort. Revisit once a real customer asks for arbitrary depth.
- **AI Assistant, AI Recommendations, Skill Gap Analysis:** deferred out of v1 scope entirely. Not on the near-term roadmap — revisit after Phase 4.
- **Signup motion:** Both self-serve and sales-led/invite-only, in v1. Implication: Auth needs both flows now (already scoped in [MODULES.md](MODULES.md) §1), and a lightweight Trial/Plan concept is pulled forward from Billing — see [ROADMAP.md](ROADMAP.md) Phase 1.

## Docs map
- [PROJECT_VISION.md](PROJECT_VISION.md) — product vision, workflow contract
- [MODULES.md](MODULES.md) — full information architecture (all modules, screens, dialogs, components, flows, dependencies, complexity)
- [ROADMAP.md](ROADMAP.md) — phasing/sequencing of modules
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — tokens, components (built out as we design)
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) — per-module deep requirements (filled in as each module goes through full design sequence)
- [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [API_SPEC.md](API_SPEC.md) — deferred to the Backend phase
