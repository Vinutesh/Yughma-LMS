# Step 2 — User Flow — Assignments

## Flow A — Create

```mermaid
flowchart TD
    A[Course Builder: + Add lesson → Assignment] --> B[Instructions, due date, submission type, points]
    B --> C[Save → appears in course tree]
```

## Flow B — Learner submits

```mermaid
flowchart TD
    A[Opens assignment from course tree] --> B[Sees instructions + due date]
    B --> C[Submits per required type]
    C --> D[Status: Submitted, awaiting grade]
    D --> E{Graded yet?}
    E -- No --> F[Can resubmit freely, replaces prior]
    E -- Yes --> G{Resubmission after grading allowed?}
    G -- Yes --> F
    G -- No --> H[Read-only: grade + feedback shown]
```

## Flow C — Instructor grades

```mermaid
flowchart TD
    A[Assignments — Manage mode, cross-course] --> B[List: each assignment, ungraded count]
    B --> C[Click one → submission queue, ungraded first]
    C --> D[Open a submission]
    D --> E{Action}
    E -- Grade --> F[Score + feedback → saves, learner notified]
    E -- Flag --> G[Marked for a second look, stays in queue]
    F --> H[Removed from ungraded queue]
```

## Carried into Step 3 (Sitemap)

Assignment editor (extends the Lesson text-editor pattern), learner submission screen, Assignments list (cross-course), submission queue, grading view.
