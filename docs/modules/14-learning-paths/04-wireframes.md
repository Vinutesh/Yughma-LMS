# Step 4 — Wireframes — Learning Paths

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Paths list (Manage mode)

```
  Paths                                       [ Create path ]
  ──────────────────────────────────────────────────────
  Name                        Status       Enrolled
  ──────────────────────────────────────────────────────
  New Sales Rep Ramp-up        Published    28
  Manager Essentials (draft)   Draft        —
```

## Path Builder

```
  ← Paths          New Sales Rep Ramp-up · Draft
  [ Courses ]  [ Settings ]                    [ Publish ]
  ──────────────────────────────────────────────────────
  1. Onboarding Compliance 2026        ⋮⋮ ✕
  2. Sales Fundamentals                ⋮⋮ ✕
  3. Data Fundamentals                 ⋮⋮ ✕

  [ + Add course ]
```

## Course picker (modal)

```
┌──────────────────────────────────────────┐
│  Add a course                          ✕  │
│  ────────────────────────────────────────│
│  Search published courses...              │
│  ┌──────────────────────────────────┐    │
│  │ ○ Sales Fundamentals               │    │
│  │ ○ Data Fundamentals                 │    │
│  │ ○ Objection Handling Deep Dive      │    │
│  └──────────────────────────────────┘    │
│              [Cancel]  [ Add selected ]   │
└──────────────────────────────────────────┘
```

## Paths (learner — My Paths tab)

```
  My Paths  [ Catalog ]
  ──────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────────┐
  │ New Sales Rep Ramp-up            1 of 3 courses    │
  └──────────────────────────────────────────────────┘
```

## Path detail (learner)

```
  ← My Paths
  New Sales Rep Ramp-up
  ──────────────────────────────────────────────────────
  1. Onboarding Compliance 2026        ✓ done
  2. Sales Fundamentals                ● in progress
  3. Data Fundamentals                 ○ locked

                                    [ Continue → ]
```
