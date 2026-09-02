# Step 2 — User Flow — Learning Paths

## Flow A — Build a path

```mermaid
flowchart TD
    A[Paths — Manage mode → Create path] --> B[Name it]
    B --> C[Add courses via picker — search published courses]
    C --> D[Reorder by drag]
    D --> E[Settings: visibility, enrollment — same pattern as Courses]
    E --> F[Publish]
```

## Flow B — Learner follows

```mermaid
flowchart TD
    A[Paths — Catalog tab] --> B[Enroll / Request to join — same branching as Courses]
    B --> C[Path detail: course tree, sequential lock/unlock]
    C --> D[Click current unlocked course → that course's own detail page]
    D --> E[Complete course → returns to path, next course unlocks]
```

## Carried into Step 3 (Sitemap)

Paths list (instructor), Path Builder, course picker, Paths (learner, tabbed), Path detail.
