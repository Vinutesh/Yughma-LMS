# Open Questions — Assignments

No blocking questions — narrowing applied:

- **Assignments are created inside a course**, the same way lessons are ([Lessons Flow A](../08-lessons/02-user-flow.md)) — "Assignment" is effectively a fifth lesson type with instructions, a due date, and a submission requirement, rather than a wholly separate authoring surface.
- **Grading is cross-course**, reached from the Manage-mode "Assignments" nav item (already present in the Shell's Teaching section) — this is the aggregated grading queue, not a per-course-only view. An instructor teaching 5 courses shouldn't have to check 5 places for what needs grading.
- **No rubric builder in v1.** Grading is a single points-possible score + a feedback comment. A full weighted-criteria rubric is real value but real added complexity — deferred, matching the "keep it simple" instruction, same reasoning as deferring Content Library's reusable-blocks feature.
- **No separate "flag for review" modal** — folded into the grading view as a lightweight toggle, consistent with the inline-state pattern used everywhere else.
- **Extend deadline** is a small inline edit on the assignment's own settings, not a separate modal.
