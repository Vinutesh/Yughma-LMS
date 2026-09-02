# Step 1 — User Journey — Skills

Personas: **Org Admin** (manages the taxonomy), **Instructor** (tags courses), **Learner** (sees their own skills).

## Journey 1 — Org Admin sets up the taxonomy

1. Manage mode → Organization → Skills (a new peer to Users/Roles/Settings — organization-wide vocabulary, same level as those).
2. Sees a flat, searchable list of skill tags. "Create skill" — just a name (e.g., "Consultative Selling," "Data Analysis").
3. Archives (not deletes) skills no longer relevant — same non-destructive pattern as everywhere else, since courses may still reference an old tag historically.

## Journey 2 — Instructor tags a course

1. In Course Builder's Settings tab, a new field: "Skills this course builds" — multi-select from the org's skill list.
2. No new skill creation happens here — if the skill they want doesn't exist yet, they'd need an Org Admin to add it first (keeps the taxonomy from sprawling uncontrolled tag-per-course).

## Journey 3 — Learner sees their skills

1. Opens "My Skills" (Learning-mode nav — see the refinement in [00-open-questions.md](00-open-questions.md)).
2. Sees every skill they've built any progress toward, each showing how many completed courses/assessments contributed to it.
3. Clicking a skill shows which specific courses counted — useful both for the learner's own sense of progress and, eventually, for a manager reviewing a report's skill coverage (Manager Dashboard, already designed, could grow a skills view later — not redesigned here).

## Edge cases

- **A course is un-tagged from a skill after learners already completed it:** their skill count doesn't retroactively drop — a skill you already demonstrated doesn't un-happen because of a later admin change. Recalculating historical skill credit is explicitly not this pass's job.
- **Skill with zero courses tagged to it yet:** shows in the admin taxonomy list normally; simply never appears on any learner's My Skills until something references it.

## What this rules in for Step 2 (User Flow)

- Skill creation is admin-only, tagging is instructor-side, viewing is learner-side — three different personas touching one shared taxonomy, each with a narrow, specific action.
- My Skills is read-only for learners — no self-declared skills in this pass (that's a different, less trustworthy model than course-completion-based credit).
