# Open Questions — Assessments

No blocking questions — narrowing applied, same spirit as Quizzes:

- **Assessment = a high-stakes variant of Quiz**, not a parallel system. Same MCQ/True-False editor from [Quizzes](../10-quizzes/), plus: a required passing score, single attempt (no retakes), an optional available-from/to window, and — on passing — automatically triggers certificate issuance ([Certificates](../15-certificates/)).
- **No live proctoring in this pass.** [MODULES.md](../../MODULES.md) §12 calls for proctoring settings; v1 ships a "Proctoring required" toggle that's stored but doesn't do anything yet (no webcam/AI vendor integration) — a placeholder for a real Phase 4+ integration, not a built feature. Flagging this clearly so it isn't mistaken for working proctoring later.
- **No separate "scheduler" screen** — the available-from/to window is two date fields in the assessment's own settings, not a standalone scheduling UI.
- **No separate question bank shared with Quizzes** — consistent with Quizzes' own decision to skip a reusable bank in v1; each assessment authors its own questions.
