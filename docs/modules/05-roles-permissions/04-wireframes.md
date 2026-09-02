# Step 4 — Wireframes — Roles & Permissions

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Lives in the Shell's Manage-mode content area.

---

## Roles list

```
  Roles                                        [ Create role ]
  ──────────────────────────────────────────────────────────
  SYSTEM ROLES
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Learner       │ │ Instructor    │ │ Manager       │ │ Org Admin     │
  │ Everyone       │ │ 8 people      │ │ 3 people      │ │ 1 person      │
  │ View only      │ │ View only     │ │ View only     │ │ View only     │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

  CUSTOM ROLES
  ┌────────────────────────────────────────────────────┐
  │ Course Approver          4 people        [ Edit ]   │
  └────────────────────────────────────────────────────┘
```

## Permission matrix — view mode (system role)

```
  ← Back to Roles
  Instructor                                    View only
  ──────────────────────────────────────────────────────────
                          View      Edit      Manage
  Courses                 ✓         ✓          –
  Assignments              ✓         ✓          –
  Reports                 ✓         –          –
  Users                   –         –          –
  Settings                –         –          –
```

## Permission matrix — edit mode (custom role, in use)

```
  ← Back to Roles
  Course Approver
  ⚠ Assigned to 4 people — changes apply immediately
  ──────────────────────────────────────────────────────────
                          View      Edit      Manage
  Courses                 [✓]       [ ]        [✓]
  Assignments              [✓]       [ ]        [ ]
  Reports                 [✓]       [ ]        [ ]
  Users                   [ ]       [ ]        [ ]
  Settings                [ ]       [ ]        [ ]

                                          [ Save changes ]
```

Checkboxes in `[ ]` are the editable state — visually the same grid as view mode, just interactive, so nobody has to learn a second layout.

## Modal — Create role

```
┌────────────────────────────────────────┐
│  Create role                         ✕  │
│  ────────────────────────────────────── │
│  Name                                    │
│  ┌──────────────────────────────────┐  │
│  │                                    │  │
│  └──────────────────────────────────┘  │
│  Start from                              │
│  (●) Clone permissions from...           │
│      ┌──────────────────────────┐       │
│      │  Instructor            ▾ │       │
│      └──────────────────────────┘       │
│  ( ) Start blank (nothing permitted)     │
│                                          │
│              [Cancel]  [ Create role ]  │
└────────────────────────────────────────┘
```

Clone is the pre-selected default (Journey 2) — blank is available but not the path of least resistance.

## Blocked — self-lockout

```
┌──────────────────────────────────────────┐
│  Can't save this change                   │
│  ────────────────────────────────────────│
│  You can't remove your own ability to     │
│  manage roles.                            │
│                                            │
│                        [ Got it ]          │
└──────────────────────────────────────────┘
```

## Blocked — role still assigned (delete)

```
┌──────────────────────────────────────────┐
│  Can't delete "Course Approver"           │
│  ────────────────────────────────────────│
│  4 people still have this role. Reassign  │
│  them first:                              │
│    • Priya Sharma                         │
│    • Raj Patel                            │
│    • +2 more                              │
│                                            │
│                        [ Got it ]          │
└──────────────────────────────────────────┘
```
