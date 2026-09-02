# Step 2 — User Flow — Assessments

## Flow A — Instructor builds

```mermaid
flowchart TD
    A[Course Builder: + Add lesson → Assessment] --> B[Add questions — same editor as Quizzes]
    B --> C[Settings: passing score, available window, proctoring toggle, linked certificate]
    C --> D[Save]
```

## Flow B — Learner takes once

```mermaid
flowchart TD
    A[Opens from course tree] --> B{Within available window?}
    B -- No --> C[Shows window dates, not startable]
    B -- Yes --> D[Pre-start notice: 'You have one attempt']
    D --> E[Confirms start]
    E --> F[One-page question set, submits]
    F --> G{Score >= passing threshold?}
    G -- Yes --> H{Certificate linked?}
    H -- Yes --> I[Certificate earned, shown inline]
    H -- No --> J[Pass result, no certificate]
    G -- No --> K[Fail result, no retake button]
```

## Carried into Step 3 (Sitemap)

Assessment editor (extends Quiz editor), pre-start notice, taking screen (reuses Quiz-taking layout), result screen (pass-with-certificate / pass-without / fail variants), not-yet-available state.
