# Step 1 — User Journey — SCORM / xAPI

Personas: **Instructor** (upload), **Learner** (play), **Org Admin** (LRS settings, xAPI viewer).

## Journey 1 — Instructor adds a SCORM lesson

1. In the Lesson-type picker (Lessons module), the instructor picks "SCORM package" alongside Video/Text/File/External Link.
2. Uploads a `.zip`. The UI shows it as processing (mirrors the Content Library upload-progress tile pattern) — real validation/extraction is backend work, so this pass shows the state without a real backend behind it.
3. Once "ready," the lesson is saved like any other lesson type.

## Journey 2 — Learner takes a SCORM lesson

1. Opens the lesson; it renders inside a sandboxed player frame, not the app's own page chrome directly wrapping the content.
2. Completion/score reported by the package (mocked) marks the lesson complete, same as any other lesson type — SCORM doesn't get a parallel completion model.

## Journey 3 — Org Admin reviews xAPI activity

1. Settings (or a Manage-mode screen) shows a read-only xAPI Statement Viewer — who did what, when, for debugging/compliance conversations with enterprise buyers.
2. Org Admin can view/edit LRS Connection Settings — endpoint + key, saved but inert.

## What this rules in for Step 2 (User Flow)

- SCORM as a Lesson content type, sharing the existing lesson-editor shell.
- One sandboxed player component, reused wherever SCORM content renders.
- xAPI Statement Viewer and LRS Settings as two small, separate screens — not one combined page, since one is a debug log and the other is a config form.
