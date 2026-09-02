# Step 4 — Wireframes — Quizzes

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Quiz editor (inside Course Builder)

```
  ← Back to Sales Fundamentals
  Quiz name
  ┌──────────────────────────────────────┐
  │  Week 2 Knowledge Check                │
  └──────────────────────────────────────┘
  ──────────────────────────────────────────
  1. What's the first step of a discovery call?  (5 pts)  ⋮⋮ ⋯
     ● Build rapport   ○ Pitch the product   ○ Ask for budget
  2. True or False: Objections mean the deal is dead.  (5 pts)  ⋮⋮ ⋯
     ● False   ○ True

  [ + Add question ]
  ──────────────────────────────────────────
  Settings
  Time limit         Randomize order       Retakes allowed
  ┌──────────┐        [x] on                ┌──────────┐
  │ 10 min ▾ │                              │ 2        │
  └──────────┘                              └──────────┘
                                    [ Save ]
```

## Add-question form (MCQ)

```
┌──────────────────────────────────────────┐
│  Add question                          ✕  │
│  ────────────────────────────────────────│
│  ( ) Multiple choice   ( ) True/False      │
│  Question text                            │
│  ┌──────────────────────────────────┐    │
│  │                                    │    │
│  └──────────────────────────────────┘    │
│  Options                    Correct?      │
│  ┌────────────────────────┐  ( )          │
│  ┌────────────────────────┐  ( )          │
│  ┌────────────────────────┐  ( )          │
│  [ + Add option ]                         │
│  Points                                    │
│  ┌────────┐                                │
│  │ 5      │                                │
│  └────────┘                                │
│              [Cancel]  [ Add question ]    │
└──────────────────────────────────────────┘
```

True/False is the same form with the options fixed to True/False (not editable), skipping straight to picking which one is correct.

## Quiz-taking screen

```
  ← Sales Fundamentals        Week 2 Knowledge Check
  2 questions · 10 pts · ⏱ 9:42 remaining
  ──────────────────────────────────────────────────────
  1. What's the first step of a discovery call?
     ( ) Build rapport
     ( ) Pitch the product
     ( ) Ask for budget

  2. True or False: Objections mean the deal is dead.
     ( ) True
     ( ) False

                                    [ Submit ]
```

## Results screen

```
  Week 2 Knowledge Check                Score: 8/10
  ──────────────────────────────────────────────────────
  1. What's the first step of a discovery call?
     ✓ Build rapport  (your answer, correct)

  2. True or False: Objections mean the deal is dead.
     ✗ True  (your answer)
     Correct answer: False

  1 of 2 retakes used

                                  [ Retake → ]
```

Once retakes are exhausted, `[ Retake → ]` is simply absent — final results stay visible, no further action offered.
