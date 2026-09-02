# Step 2 — User Flow — Lessons

## Flow A — Instructor adds a lesson

```mermaid
flowchart TD
    A[Course Builder: + Add lesson] --> B[Type picker: Video / Text / PDF / External Link]
    B -- Video/PDF --> C[Content Library picker mode]
    B -- Text --> D[Rich text editor]
    B -- External Link --> E[URL + label field]
    C --> F[Name lesson, save]
    D --> F
    E --> F
    F --> G[Returns to Course Builder tree, lesson in place]
```

## Flow B — Learner views a lesson

```mermaid
flowchart TD
    A[Course detail: click unlocked lesson] --> B{Type}
    B -- Video/PDF --> C[Renders inline, auto-marks complete on open]
    B -- External Link --> D[Interstitial: 'This opens an external site' → Continue]
    D --> E[Opens externally, marks complete]
    B -- Text --> F[Renders formatted text, learner clicks 'Mark complete']
    C --> G[Next lesson →]
    F --> G
```

## Carried into Step 3 (Sitemap)

Type picker, 3 editor variants (Content Library picker reused for Video/PDF, Text editor, External Link form), lesson viewer (per-type rendering + external-link interstitial).
