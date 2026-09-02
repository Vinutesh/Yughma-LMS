# Step 4 — Wireframes — Courses

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Lives in the Shell's content area (Learning mode for learner screens, Manage mode for instructor screens).

---

## Learner: Courses (Catalog tab)

```
  [ My Courses ]  [ Catalog ]
  ──────────────────────────────────────────────────────
  Search...        Category ▾
  ──────────────────────────────────────────────────────
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ [thumb]        │ │ [thumb]        │ │ [thumb]        │
  │ Sales           │ │ Onboarding      │ │ Data            │
  │ Fundamentals    │ │ Compliance 2026 │ │ Fundamentals    │
  │ 6 modules       │ │ 3 modules       │ │ 8 modules       │
  └──────────────┘ └──────────────┘ └──────────────┘
```

## Learner: Courses (My Courses tab)

```
  My Courses  [ Catalog ]
  ──────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────────┐
  │ Onboarding Compliance 2026        ▓▓▓▓▓▓░░░░ 60%  │
  └──────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────┐
  │ Sales Fundamentals                Requested        │
  └──────────────────────────────────────────────────┘
```

## Course detail (learner view / instructor preview — same screen)

```
  ← Back                                    [Editing banner — instructor view only]
  Sales Fundamentals
  by Priya Sharma · 6 modules · ~4 hrs
  ──────────────────────────────────────────────────────
  A practical intro to consultative selling for new
  account executives.

  Module 1: Intro to Consultative Selling      ✓ done
    ▸ Lesson: What is consultative selling?      ✓
    ▸ Lesson: The discovery call                 ✓
  Module 2: Objection Handling                  ● in progress
    ▸ Lesson: Common objections                  ○
  Module 3: Closing Techniques                  ○ locked

                                    [ Continue → ]
```

Not-yet-enrolled state replaces the progress markers and "Continue" with a plain syllabus list and an `[ Enroll ]` / `[ Request to join ]` button.

## Instructor: Courses list (Manage mode)

```
  Courses                                     [ Create course ]
  ──────────────────────────────────────────────────────
  Name                        Status       Enrolled   ⋯
  ──────────────────────────────────────────────────────
  Sales Fundamentals          Published    42          ⋯
  Onboarding Compliance 2026  Published    118         ⋯
  Data Fundamentals (draft)   Draft        —           ⋯
```

`⋯` menu: Edit / Duplicate / Archive.

## Course Builder — Content tab

```
  ← Courses          Sales Fundamentals · Draft
  [ Content ]  [ Settings ]                        [ Publish ]
  ──────────────────────────────────────────────────────
  Module 1: Intro to Consultative Selling      ⋮⋮ ⋯
    ▸ What is consultative selling?  (Video)     ⋮⋮ ⋯
    ▸ The discovery call  (Text)                 ⋮⋮ ⋯
    [ + Add lesson ]
  Module 2: Objection Handling                  ⋮⋮ ⋯
    [ + Add lesson ]

  [ + Add module ]
```

`⋮⋮` is the drag handle for reordering; `⋯` opens rename/delete for that module or lesson.

## Course Builder — Settings tab

```
  ← Courses          Sales Fundamentals · Draft
  [ Content ]  [ Settings ]                        [ Publish ]
  ──────────────────────────────────────────────────────
  Visibility
  ( ) Public catalog     (●) Invite-only

  Enrollment
  (●) Open — anyone can enroll instantly
  ( ) Request approval — instructor approves each request

  Prerequisites
  ┌──────────────────────────────────────┐
  │  Onboarding Compliance 2026       ✕  │
  │  + Add prerequisite...                │
  └──────────────────────────────────────┘
```

## Inline states

**Publish blocked (zero lessons):**
```
┌──────────────────────────────────────────┐
│  Can't publish yet                        │
│  ────────────────────────────────────────│
│  Add at least one lesson before           │
│  publishing this course.                  │
│                        [ Got it ]          │
└──────────────────────────────────────────┘
```

**Publish confirm:**
```
┌──────────────────────────────────────────┐
│  Publish "Sales Fundamentals"?            │
│  ────────────────────────────────────────│
│  It'll appear in the catalog and be       │
│  open for instant enrollment, per your    │
│  Settings tab.                            │
│              [Cancel]  [ Publish ]         │
└──────────────────────────────────────────┘
```

**Archive warning (active enrollments):**
```
┌──────────────────────────────────────────┐
│  Archive "Sales Fundamentals"?            │
│  ────────────────────────────────────────│
│  42 people are enrolled. They'll keep     │
│  access to finish it — it just stops      │
│  appearing for new enrollment.            │
│              [Cancel]  [ Archive ]         │
└──────────────────────────────────────────┘
```

**Prerequisite cycle guard:**
```
  ⚠ Adding "Sales Fundamentals" here would create a loop —
     it already requires this course.
```
