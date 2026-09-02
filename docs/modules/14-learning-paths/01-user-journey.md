# Step 1 — User Journey — Learning Paths

Personas: **Instructor/Org Admin** (builds paths) and **Learner** (follows one).

## Journey 1 — Building a path

1. Manage mode → Teaching → Paths (a new peer to Courses — paths are org-level curricula, often spanning multiple instructors' courses, so this sits at the same level as Courses rather than inside one course).
2. "Create path" — names it, then adds courses in order via a picker (search existing published courses, add to the sequence).
3. Reorders by drag, same interaction language as the Course Builder's module/lesson reordering.
4. Publishes — same visibility/enrollment settings pattern as Courses (public catalog vs. invite-only, open vs. request-approval).

## Journey 2 — Learner follows a path

1. Courses and Paths are separate top-level areas (per the Shell's existing "Learning Paths" nav item) — browses/enrolls in a path the same way as a course (Courses Journey 1's flow, applied one level up).
2. Path detail shows the course sequence as a tree: completed courses checked off, the current one open, later ones locked until reached — visually the same pattern as Course detail's module/lesson tree.
3. Clicking the current unlocked course drops them into that course's own detail page — the path itself doesn't duplicate course content, just sequences access to it.

## Edge cases

- **A course inside a path gets archived** (Courses Journey 4) while still referenced by an active path: same "don't orphan" instinct as everywhere else — archiving a course still lets existing path-enrolled learners finish it, it just can't be added to new paths going forward.
- **Learner already independently enrolled in a course that a path later includes:** their existing progress carries over — enrolling via a path doesn't reset progress on a course they'd already started on their own.

## What this rules in for Step 2 (User Flow)

- Path Builder's "add course" step is a picker over existing published courses, not a creation flow.
- Path detail's tree-with-locking pattern directly reuses Course detail's — not a new visual language to design.
