# Step 1 — User Journey — Career Paths

## Journey 1 — Org Admin builds one

1. Manage mode → Organization → Career Paths → "Create."
2. Names the target role ("Senior Account Executive"), adds required skills in order (picker over the org's existing Skills taxonomy).
3. Each skill row shows which Learning Path/Course(s) already build it (auto-resolved, not chosen manually) — if a required skill has nothing built for it yet, that row shows "No content yet" rather than blocking creation, since the path can still be published as a target to aim for.

## Journey 2 — Learner explores and follows one

1. Career Paths (new Learning-mode nav item) — browses available targets, opens one.
2. Sees the skill sequence with progress per skill (reusing [Skills](../16-skills/) detail data), and for each not-yet-built skill, a direct link into the Learning Path/Course that builds it.
3. This is explicitly a self-directed map, not an enrollment — there's no "enroll in a career path," just visibility and shortcuts into the real learning content.

## Edge cases

- **A skill required by a career path has multiple courses that build it:** all are listed as options, not forced into one — learner picks whichever fits.
- **Career path with a skill that has zero content:** shown honestly as a gap, not hidden — useful signal for both the learner and whoever owns content planning.

## What this rules in for Step 2 (User Flow)

- No enrollment concept — Career Paths is a navigation/visibility layer over Skills + Learning Paths, not its own progress-tracking system.
