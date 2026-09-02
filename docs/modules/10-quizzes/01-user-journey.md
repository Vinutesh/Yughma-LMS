# Step 1 — User Journey — Quizzes

Personas: **Instructor** (authors) and **Learner** (takes).

## Journey 1 — Instructor builds a quiz

1. Course Builder → "+ Add lesson" → Quiz (a fourth/fifth type alongside Video/Text/PDF/External Link/Assignment).
2. Adds questions one at a time: picks MCQ or True/False, writes the question text, options (MCQ), marks the correct answer, sets points.
3. Sets quiz-level options: time limit (optional — off by default), randomize question order (off by default), retakes allowed (default: 1, can raise or set unlimited).
4. Saves — appears in the course tree like any lesson.

## Journey 2 — Learner takes a quiz

1. Opens it from the course tree. Sees question count, points possible, time limit (if any), and how many attempts remain.
2. All questions on one page (not one-at-a-time paging — simpler for a v1 with no per-question navigation logic to design). If timed, a persistent countdown is visible throughout.
3. Submits (or is auto-submitted if the timer runs out) — scored instantly since every question type is auto-gradable.
4. Sees results immediately: score, and per-question correct/incorrect with the right answer shown — no "waiting for grading" state exists in this module, unlike Assignments.

## Journey 3 — Retaking

1. If attempts remain, "Retake" is available from the results screen.
2. If randomization is on, question order shuffles again on retake (options within an MCQ question can also shuffle — same toggle covers both, kept as one setting rather than two for simplicity).
3. Once attempts are exhausted, "Retake" is replaced with the final results, no further action available.

## Edge cases

- **Timer runs out mid-quiz:** auto-submits whatever's answered so far — no penalty beyond unanswered questions being marked wrong, no separate "time's up" blocking screen.
- **Quiz with zero questions:** blocked from being added to a course, same "empty content can't ship" rule as Courses and Text lessons.
- **Retake with unlimited attempts, but the instructor changed a question after the first attempt:** each attempt is scored against the quiz's *current* content, not a frozen snapshot — simplest possible model, flagged here since a more rigorous versioned-quiz approach is a legitimate future refinement, not this pass's job.

## What this rules in for Step 2 (User Flow)

- Instant auto-grading means there's no separate grading-queue flow to design for this module, unlike Assignments — a real simplification worth calling out.
- Retake is a state on the results screen, not a separate screen.
- Randomization is one toggle covering both question order and option order.
