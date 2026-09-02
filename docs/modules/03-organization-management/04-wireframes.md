# Step 4 — Wireframes — Organization Management

Markdown/ASCII per the standing note in [CLAUDE.md](../../CLAUDE.md). Both tabs live inside the Shell's Manage-mode content area (sidebar + top bar already wireframed in the Shell module — not redrawn here, only the content area is new).

---

## Settings — General tab

```
  [ General ]  [ Departments & Teams ]
  ──────────────────────────────────────────
  Organization name
  ┌────────────────────────────────────┐
  │  Acme Corp                          │
  └────────────────────────────────────┘
  Logo                        Industry
  ┌───────────┐               ┌────────────────┐
  │  [img]  Change │           │  Technology  ▾ │
  └───────────┘               └────────────────┘
  Organization size
  ┌────────────────────────────────────┐
  │  201–500 employees               ▾  │
  └────────────────────────────────────┘

  [ Save changes ]
```

## Settings — Departments & Teams tab

```
  [ General ]  [ Departments & Teams ]
  ──────────────────────────────────────────
                                [+ Create department]

  ▾ Sales                          42 members   ⋯
      Sales — West                 18 members   ⋯
      Sales — East                 24 members   ⋯
                                    [+ Add team]

  ▾ Engineering                    67 members   ⋯
      (no teams yet)                            [+ Add team]

  ▸ Customer Success               12 members   ⋯
```

- `⋯` opens the row menu: Rename / Archive.
- Chevron (▾/▸) expands/collapses a department's teams — collapsed by default for departments with many teams, to keep the list scannable.

**Empty state (no departments yet):**
```
              No departments yet
   Group your people to scope reporting
          and enrollment.

         [ + Create department ]
```

## Modal — Create department

```
┌──────────────────────────────────┐
│  Create department            ✕  │
│  ──────────────────────────────  │
│  Name                             │
│  ┌──────────────────────────┐    │
│  │                            │    │
│  └──────────────────────────┘    │
│                                    │
│              [Cancel] [ Create ]  │
└──────────────────────────────────┘
```

## Modal — Create team

Identical pattern, with a read-only "Department" field showing which department it's being added under (set by which row's "+ Add team" was clicked, not chosen from a dropdown — avoids a mis-click putting a team under the wrong department).

## Shared — Archive confirm

```
┌──────────────────────────────────────────┐
│  Archive "Sales"?                         │
│  ────────────────────────────────────────│
│  Members keep their history, but this     │
│  stops appearing in new assignments.      │
│                                            │
│              [Cancel]  [ Archive ]         │
└──────────────────────────────────────────┘
```
