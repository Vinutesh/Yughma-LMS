# Step 1 — User Journey — Lessons

Two personas: **Instructor** (authoring, inside Course Builder) and **Learner** (viewing, from Course detail).

## Journey 1 — Instructor adds a lesson

1. From the Course Builder's Content tab, "+ Add lesson" opens the lesson-type picker: Video / Text / PDF / External Link.
2. Picks a type → lands in that type's editor, already nested under the right module:
   - **Video/PDF:** opens Content Library in picker mode — pick existing or upload new (Content Library Journey 2).
   - **Text:** a simple rich-text editor (headings, bold/italic, lists, images) — no separate library involved.
   - **External Link:** a single URL field + a label.
3. Names the lesson (defaults to the file/link name, editable), saves — returns to the Course Builder tree with the new lesson in place.

## Journey 2 — Learner opens a lesson

1. From Course detail's syllabus tree, clicks an unlocked lesson.
2. Lesson viewer renders per type: video player, PDF viewer, formatted text, or (for External Link) a clear "This opens an external site" interstitial before leaving the product — an external link shouldn't silently navigate someone away without warning.
3. Video/PDF/External Link: marked complete automatically once opened. Text: reads it, clicks "Mark complete" explicitly.
4. "Next lesson" navigation at the bottom keeps them moving through the course without going back to the syllabus tree each time — reduces friction for the common straight-through-the-course case.

## Edge cases

- **Reordering lessons that learners have already partially completed:** completion is tracked per-lesson, not per-position, so reordering doesn't affect anyone's progress — worth stating even though invisible in the UI, since it rules out needing a reorder-impact warning.
- **Deleting a lesson learners have already completed:** their completion record for that lesson is simply gone (nothing to preserve — the lesson itself no longer exists) — no special warning needed since it's a natural consequence, not a surprising one.
- **Text lesson with no content saved:** blocked from being added to a course the same way an empty course can't publish (Courses Journey 4) — an empty lesson is a broken learner experience.

## What this rules in for Step 2 (User Flow)

- One shared type-picker entry point, four different editor bodies.
- Completion behavior branches by type — this needs to be visible in the flow, not just a footnote.
- External links get a deliberate interstitial, not a silent redirect.
