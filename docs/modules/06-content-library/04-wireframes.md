# Step 4 — Wireframes — Content Library

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Lives in the Shell's Manage-mode content area.

---

## Library grid (default mode)

```
  Content Library                              [ Upload ]
  ──────────────────────────────────────────────────────────
  Search...     Folder ▾     Tag ▾
  ──────────────────────────────────────────────────────────
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ [thumb]   │ │ [thumb]   │ │ ▓▓▓▓▓ 63% │ │ [thumb]   │
  │ onboard-  │ │ sales-    │ │ new-      │ │ handbook. │
  │ ing.mp4   │ │ deck.pdf  │ │ upload.mp4│ │ pdf       │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

The third tile shows the inline upload-progress state (Flow A) — same tile, same grid position it'll occupy once complete.

## Library grid (picker mode — launched from a lesson builder)

```
  Choose content                          [ Upload new ]  ✕
  ──────────────────────────────────────────────────────────
  Search...     Folder ▾     Tag ▾
  ──────────────────────────────────────────────────────────
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ [thumb]  ●│ │ [thumb]   │ │ [thumb]   │      selected tile
  │ onboard-  │ │ sales-    │ │ handbook. │      gets a filled
  │ ing.mp4   │ │ deck.pdf  │ │ pdf       │      selection dot
  └──────────┘ └──────────┘ └──────────┘

                                       [ Use selected ]
```

Same grid, same filters — only difference is the selection affordance and the "Use selected" footer action replacing the plain "Upload" header button (though "Upload new" is still reachable, per Flow B).

## Detail panel

```
                              ┌────────────────────────────┐
                              │  onboarding.mp4          ✕  │
                              │  [ preview ]                │
                              │  ────────────────────────── │
                              │  4:32 · 128 MB · uploaded by │
                              │  Priya Sharma, Aug 2         │
                              │  Tags: onboarding, culture   │
                              │  Folder: Onboarding          │
                              │  ────────────────────────── │
                              │  Used in:                    │
                              │  • Onboarding Compliance 2026 │
                              │  • Sales Fundamentals         │
                              │  ────────────────────────── │
                              │  Rename   Move   Replace file │
                              │  Delete                       │
                              └────────────────────────────┘
```

## Blocked — delete while referenced

```
┌──────────────────────────────────────────┐
│  Can't delete "onboarding.mp4"            │
│  ────────────────────────────────────────│
│  Still used in 2 places:                  │
│    • Onboarding Compliance 2026           │
│    • Sales Fundamentals                    │
│  Remove it from those first.               │
│                                            │
│                        [ Got it ]          │
└──────────────────────────────────────────┘
```
