# Step 1 — User Journey — Assignments

Personas: **Instructor** (creates + grades) and **Learner** (submits).

## Journey 1 — Instructor creates an assignment

1. From Course Builder's Content tab, "+ Add lesson" → Assignment (added to the type picker from [Lessons](../08-lessons/)).
2. Sets: instructions (rich text, same editor as a Text lesson), due date, submission type (text entry, file upload, or both), points possible.
3. Saves — appears in the course tree like any lesson, and now also surfaces in the cross-course Assignments list once it's part of a published course.

## Journey 2 — Learner submits

1. Opens the assignment from the course tree (same entry point as any lesson).
2. Sees instructions, due date (with a visibly different treatment if it's overdue), and the submission area matching the type set by the instructor.
3. Submits — status becomes "Submitted, awaiting grade." Can resubmit up until it's graded, or if the instructor allows resubmission after grading (a per-assignment setting) — replaces the prior submission rather than stacking multiple.

## Journey 3 — Instructor grades

1. Opens Assignments (Manage mode, cross-course) — sees every assignment across their courses with an ungraded-submission count.
2. Clicks into one, sees a queue of submissions (ungraded first, by default).
3. Opens a submission, sees the learner's work alongside instructions for reference, enters a score and optional feedback comment, can flag it for a second look instead of grading immediately.
4. Grading it moves it out of the ungraded queue; the learner sees their score + feedback on the assignment.

## Edge cases

- **Submission after the due date:** allowed but visibly marked "Late" in the grading queue — not blocked outright, since real-world late work still needs to be gradable, just clearly flagged.
- **Instructor extends the deadline after some learners already submitted late:** those existing submissions' "Late" marker is recalculated against the new deadline (a late submission that's now on-time under the extension stops showing as late) — worth stating so it doesn't read as a bug later.
- **Learner resubmits after grading, when resubmission-after-grading isn't allowed for this assignment:** the submission area simply isn't available anymore — shows the grade/feedback in a read-only state instead.

## What this rules in for Step 2 (User Flow)

- Assignment creation reuses the Lesson-editor pattern almost entirely — only new fields are due date, submission type, and points.
- The grading queue defaults to ungraded-first, cross-course.
- Late-marking is dynamic (recalculated against the current due date), not a one-time stamp at submission time.
