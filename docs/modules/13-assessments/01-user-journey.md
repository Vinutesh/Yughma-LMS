# Step 1 — User Journey — Assessments

Personas: **Instructor** (authors) and **Learner** (takes, once).

## Journey 1 — Instructor builds an assessment

1. Course Builder → "+ Add lesson" → Assessment (extends the type picker from [Lessons](../08-lessons/)).
2. Adds questions exactly like a Quiz (MCQ/True-False), then sets what makes it an assessment rather than a quiz: passing score (e.g., 80%), available window (optional — leave blank for always-open), proctoring required (toggle, stored only per [00-open-questions.md](00-open-questions.md)).
3. Can optionally link a Certificate template to award on passing (Certificates module, out of scope here) — if none is linked, passing just records a pass/fail result with no certificate.

## Journey 2 — Learner takes it (once)

1. Opens it from the course tree — sees a clear "You have one attempt" notice before starting (unlike Quizzes, where multiple attempts are the norm), so nobody accidentally burns their only shot without realizing it.
2. If outside the available window, it's simply not startable yet — shows the window dates instead of a start button.
3. Takes it (same one-page format as Quizzes), submits.
4. Result: Pass or Fail against the threshold, shown immediately (still auto-graded — same MCQ/True-False constraint as Quizzes). If passed and a certificate is linked, sees "Certificate earned" right there, with a link into their certificate.

## Edge cases

- **Learner fails their one attempt:** no retake button — the result stands. Whether failed assessments can ever be retaken (e.g., an instructor manually resetting someone's attempt) is a real question worth asking a design partner, but not designed here — flagged as a known gap for now rather than guessed at.
- **Assessment window closes while someone's mid-attempt:** they're allowed to finish the attempt already in progress — a window closing shouldn't yank away a submission that's already underway.

## What this rules in for Step 2 (User Flow)

- The "one attempt" framing needs a pre-start confirmation, unlike Quizzes' zero-friction start.
- Availability-window gating happens at the entry point (course tree / assessment landing), not mid-take.
- Passing routes into Certificates as a trigger, not a separate manual step.
