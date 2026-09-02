# Step 4 — Wireframes — Cross-Cutting Shell

**Figma file:** [Yughma LMS — Cross-Cutting Shell](https://www.figma.com/design/WjZJznJtiduCQWiEh21dTY) (page: "Wireframes")

Deliberately low-fidelity — gray boxes, generic labels, no branding or color system. Per the confirmed scope (2026-08-05): the in-house design team handles final visual design, so the goal here is a structurally correct, self-explanatory reference they can open and restyle directly, not a polished visual design. See [CLAUDE.md](../../CLAUDE.md) for the full rationale. Every frame realizes one or more nodes from [03-sitemap.md](03-sitemap.md).

## Frames

| # | Frame | Sitemap node(s) | What it shows |
|---|---|---|---|
| 1 | Shell: Learning Mode (Home) | Home | Full chrome: sidebar (Learning nav, mode switch), top bar (org label, search, bell, avatar), content (continue learning, stats, activity). This is the reference shell every other frame reuses. |
| 2 | Shell: Manage Mode (Default Landing) | Manage-mode default landing | Same chrome, mode switch flipped to Manage. Sidebar shows the three permission-scoped sections (Teaching / Team / Organization) from [00-open-questions.md](00-open-questions.md)'s mode-switch model. Content is an intentionally generic placeholder — Courses (authoring) gets its own sitemap/wireframes when that module is designed. |
| 3 | Shell: Command Palette (overlay) | Search Results / palette | Dimmed scrim over the Learning-mode shell, centered palette with grouped results (Courses / People / Actions), matching Flow D. Annotated with the permission-scoping rule for search results. |
| 4 | Shell: Notification Panel (overlay) | Notification panel | Dropdown anchored top-right, unread items visually distinct, matching Flow E. Annotated that the empty state ("You're all caught up") isn't shown here — it's a separate state to build when this frame is reskinned. |
| 5 | Content Area: 404 | 404 | Shell frame stays fully intact (sidebar/top bar unchanged); only the content area shows the not-found message + a way back to Home — per Flow H, the user is never stranded without navigation. |
| 6 | Content Area: Permission Denied | Permission Denied | Same pattern as 404 — shell intact, content area swapped. This is the shared panel every future module reuses rather than each one inventing its own. |
| 7 | System: Session Expired (no shell) | Session Expired | Deliberately has **no** sidebar/top bar — per Flow F, the user is logged out at this point, so the shell chrome (which assumes an authenticated session) doesn't apply. Standalone centered card instead. |
| 8 | Shell: Offline Banner | (banner state, not a sitemap node — layered over any screen) | Full-width banner strip above the top bar, non-blocking, shell and content underneath stay visible — per Flow H, offline is a state layered on top of whatever's already on screen, not a separate page. |

## What's intentionally not built here

- **Empty states** for search and notifications (annotated as call-outs instead of separate frames, to keep this pass small — build when reskinning).
- **Maintenance / System Status** screen — same template as Session Expired (standalone, no shell); not worth a near-duplicate frame at wireframe fidelity.
- Any color, type, or spacing system — that's explicitly deferred to the design team / [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md).

## Known build note

Two frames (Command Palette, Offline Banner) hit the same Figma auto-layout footgun during construction: calling `resize()` before children were added locks both axes to `FIXED`, collapsing the container to near-zero height until the sizing mode is reset. Fixed by re-hugging the content axis after populating children. Not a design decision — just a note in case the design team extends these frames and hits the same issue.
