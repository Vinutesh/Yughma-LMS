# Step 2 — User Flow — Skills

## Flow A — Admin manages taxonomy

```mermaid
flowchart TD
    A[Skills — Manage mode] --> B[Create skill: name only]
    A --> C[Archive existing skill]
```

## Flow B — Instructor tags a course

```mermaid
flowchart TD
    A[Course Builder → Settings tab] --> B[Multi-select: Skills this course builds]
    B --> C[Save — no new-skill creation here]
```

## Flow C — Learner views skills

```mermaid
flowchart TD
    A[My Skills] --> B[List: skill name + count of contributing completions]
    B --> C[Click a skill → which courses counted]
```

## Carried into Step 3 (Sitemap)

Skills taxonomy list (admin), course-settings addition (not a new screen), My Skills (learner), skill detail (contributing courses).
