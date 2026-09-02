# Step 4 — Wireframes — Assessments

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Question editing itself is identical to [Quizzes' add-question form](../10-quizzes/04-wireframes.md) — not redrawn here, only what's new.

---

## Assessment settings (appended to the same editor as Quizzes)

```
  Settings
  Passing score        Available from → to      Proctoring
  ┌──────────┐         ┌──────────┐ ┌──────────┐ [ ] Required
  │ 80%       │         │ Aug 1    │ │ Aug 31   │
  └──────────┘         └──────────┘ └──────────┘
  Award certificate on pass
  ┌────────────────────────────────────┐
  │  Sales Fundamentals Completion  ▾   │
  └────────────────────────────────────┘
```

## Pre-start notice

```
┌──────────────────────────────────────────┐
│  Sales Certification Exam                  │
│  ────────────────────────────────────────│
│  10 questions · Passing score: 80%         │
│  You have ONE attempt — make sure          │
│  you're ready before starting.             │
│                                            │
│                        [ Start attempt ]   │
└──────────────────────────────────────────┘
```

## Not-yet-available state

```
  Sales Certification Exam
  ──────────────────────────────────────────────────────
  This assessment opens Aug 1 and closes Aug 31.
  Not available yet.
```

## Result — Pass with certificate

```
  Sales Certification Exam           Result: Pass (86%)
  ──────────────────────────────────────────────────────
  🏆 Certificate earned: Sales Fundamentals Completion

                              [ View certificate → ]
```

## Result — Fail

```
  Sales Certification Exam           Result: Fail (64%)
  ──────────────────────────────────────────────────────
  You needed 80% to pass. This was your only attempt.
```
