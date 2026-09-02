# Step 2 — User Flow — Courses

## Flow A — Learner: browse → enroll → progress

```mermaid
flowchart TD
    A[Courses — My Courses tab] --> B{Any enrollments?}
    B -- No --> C[Defaults to Catalog tab instead]
    B -- Yes --> D[Shows enrolled courses with progress]
    C --> E[Browse/search/filter, click a course]
    E --> F[Course detail: syllabus, instructor, duration]
    F --> G{Enrollment rule}
    G -- Open --> H[Button: Enroll → instant]
    G -- Approval required --> I[Button: Request to join → pending state]
    H --> J[Now in My Courses, tree becomes navigable]
    I --> K{Instructor approves?}
    K -- Yes --> J
    K -- No / pending --> L[Stays 'Requested' in My Courses]
```

## Flow B — Instructor: create and build

```mermaid
flowchart TD
    A[Courses list — Manage mode] --> B[Create course: name only]
    B --> C[Course Builder opens, Draft status]
    C --> D[Content tab: add modules, add lessons, reorder]
    C --> E[Settings tab: visibility, enrollment rule, prerequisites]
    D --> F{Publish}
    E --> F
    F --> G{Zero lessons?}
    G -- Yes --> H[Blocked: 'Add at least one lesson before publishing']
    G -- No --> I[Confirm: 'This becomes visible/enrollable per your settings']
    I --> J[Status → Published]
```

## Flow C — Instructor: manage a live course

```mermaid
flowchart TD
    A[Courses list] --> B{Action on a course row}
    B -- Duplicate --> C[Instant Draft copy, opens in builder]
    B -- Archive --> D{Anyone actively enrolled?}
    D -- Yes --> E[Warning: 'They keep access to finish; stops appearing for new enrollment' → confirm]
    D -- No --> F[Archived immediately]
    B -- Edit --> G[Reopens Course Builder, live edits]
```

## Flow D — Prerequisite cycle guard

```mermaid
flowchart TD
    A[Settings tab: add a prerequisite course] --> B{Would this create a cycle?}
    B -- Yes --> C[Blocked inline: 'This would create a loop with <course>']
    B -- No --> D[Added]
```

## Carried into Step 3 (Sitemap)

Courses (learner, tabbed), Course detail (dual-purpose: learner view / instructor preview), Courses list (instructor), Course Builder (2 tabs), create-course inline flow, publish-confirm, publish-blocked, archive-warning, cycle-guard.
