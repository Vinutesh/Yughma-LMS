# Step 2 — User Flow — Quizzes

## Flow A — Instructor builds

```mermaid
flowchart TD
    A[Course Builder: + Add lesson → Quiz] --> B[Add question: MCQ or True/False]
    B --> C[Text, options, correct answer, points]
    C --> D{Add another?}
    D -- Yes --> B
    D -- No --> E[Quiz settings: time limit, randomize, retakes allowed]
    E --> F{Zero questions?}
    F -- Yes --> G[Blocked: 'Add at least one question']
    F -- No --> H[Save → appears in course tree]
```

## Flow B — Learner takes and retakes

```mermaid
flowchart TD
    A[Opens quiz from course tree] --> B[All questions on one page, timer visible if set]
    B --> C{Submits or timer expires}
    C --> D[Auto-graded instantly]
    D --> E[Results: score + per-question correct/incorrect + right answers]
    E --> F{Attempts remaining?}
    F -- Yes --> G[Retake → reshuffled if randomization on]
    F -- No --> H[Final results, no further action]
    G --> B
```

## Carried into Step 3 (Sitemap)

Quiz editor (question list + add-question form + settings), quiz-taking screen, results screen (with retake state).
