# Step 1 — User Journey — Courses

Two personas: **Learner** (Learning mode) and **Instructor** (Manage mode → Teaching → Courses).

## Journey 1 — Learner browses and enrolls

1. Opens Courses (Learning mode) — lands on "My Courses" tab if they have any enrollments, otherwise "Catalog" is the default (no point defaulting to an empty tab).
2. Switches to Catalog, browses/searches/filters (by category, skill — whatever taxonomy exists), clicks a course.
3. Course detail: title, description, syllabus outline (modules/lessons listed but not openable until enrolled), instructor, duration estimate. "Enroll" is the primary action.
4. Enrolls — button becomes "Continue" or "Start," course now appears under My Courses. Enrollment might be instant (open enrollment) or request-based depending on the course's enrollment rules (Instructor Journey 3) — the learner-facing difference is just whether the button says "Enroll" (instant) or "Request to join" (approval needed).

## Journey 2 — Learner works through a course

1. From My Courses or the Home continue-learning cards (Shell module), opens a course they're enrolled in.
2. Course detail now shows the module/lesson tree as navigable — clicking a lesson opens it (Lessons module, out of scope here).
3. Progress is visibly tracked (completed lessons marked, an overall percentage) — this detail page is also where "where am I in this course" gets answered, not just a syllabus.

## Journey 3 — Instructor creates and builds a course

1. From Manage mode's Courses list (the screen the Shell module wireframed as a generic placeholder — this module fills it in), clicks "Create course."
2. Names it, lands directly in the Course Builder as a Draft — no separate creation wizard, naming is the only thing asked upfront.
3. Builder has two tabs: **Content** (the module/lesson tree — add modules, add lessons inside them, reorder by drag) and **Settings** (visibility: public catalog vs. invite-only; enrollment: open vs. request-approval; prerequisites: pick other courses that must be completed first).
4. Builds out the tree. Each lesson placeholder links into the Lessons module to actually author its content (out of scope here) — this module only owns the *structure*, not lesson content itself.
5. When ready, "Publish" — a lightweight confirmation surfaces what becomes true once published (visible in the catalog per the visibility setting, enrollable per the enrollment setting) rather than a generic "are you sure."

## Journey 4 — Instructor manages a live course

1. From the Courses list, sees Draft/Published/Archived status per course, enrollment counts for published ones.
2. Can duplicate a course (Journey covered in Open Questions — instant Draft copy), archive one that's no longer offered (not delete — same reasoning as departments: don't orphan learner completion history), or reopen the builder to keep editing a published course (edits to a published course go live immediately — no separate draft/live versioning in this pass, flagged as a real simplification for a later look).

## Edge cases

- **Publishing a course with zero lessons:** blocked — an empty published course is a broken learner experience, not a valid state.
- **Archiving a course learners are actively enrolled in:** allowed, but with an explicit warning about what happens to their in-progress enrollment (they keep access to finish it; it just stops appearing for new enrollment) — same non-destructive framing as every other archive action so far.
- **Prerequisite cycles** (Course A requires B, B requires A): blocked at the point of adding the second prerequisite, with a clear "this would create a loop" message rather than allowing an unsatisfiable requirement to be saved.

## What this rules in for Step 2 (User Flow)

- Enroll button text branches on the course's enrollment-rule setting (instant vs. request), one button doing double duty rather than two different flows.
- Publish is a confirm-with-consequences, not a blocking multi-step wizard.
- Editing a published course happens in the same builder, live — no separate "draft version of a published course" concept in this pass.
