# Step 4 — Wireframes — Dashboard

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Lives in the Shell's Manage-mode content area, replacing the generic placeholder from the Shell module's own wireframes (per the refinement in [00-open-questions.md](00-open-questions.md)).

---

## Instructor Dashboard

```
  Dashboard
  ──────────────────────────────────────────────────────
  Needs grading
  ┌────────────────────────────────────────────────────┐
  │ Week 3 Reflection — Sales Fundamentals      7 →      │
  │ Discovery Call Recording — Sales Fund.      3 →      │
  └────────────────────────────────────────────────────┘

  Low engagement
  ┌────────────────────────────────────────────────────┐
  │ 12 learners haven't started Sales Fundamentals   →  │
  └────────────────────────────────────────────────────┘

  Recent submissions
  Raj Patel — Week 3 Reflection — 2 hrs ago
  Jamie Lee — Week 3 Reflection — 5 hrs ago
```

**Empty state:**
```
  Dashboard
  ──────────────────────────────────────────────────────
              No submissions yet
     Once learners start your courses,
        you'll see activity here.
```

## Manager Dashboard

```
  Dashboard
  ──────────────────────────────────────────────────────
  Team completion                         78%  ▓▓▓▓▓▓▓░░
  ┌────────────────────────────────────────────────────┐
  │ Overdue                                              │
  │ Raj Patel — Onboarding Compliance 2026 — 3 days   → │
  │ Jamie Lee — Onboarding Compliance 2026 — 1 day    → │
  └────────────────────────────────────────────────────┘
```

**Empty state:**
```
  Dashboard
  ──────────────────────────────────────────────────────
           No team members assigned yet
    Add people to your team from Users.
```

## Org Admin Dashboard (with checklist still open)

```
  Dashboard
  ──────────────────────────────────────────────────────
  Active users        Completions (30d)      Departments
  118                  342                    3

  ┌────────────────────────────────────────────────────┐
  │ Finish setting up Acme Corp                     ✕   │
  │ ○ Add your org logo & industry                       │
  │ ○ Tell us what you're using this for                 │
  │ ○ Invite your team                                   │
  └────────────────────────────────────────────────────┘

  Quick links:  Users →   Roles →   Settings →
```

**Once the checklist is complete, that block simply isn't rendered** — stats + quick links only.
