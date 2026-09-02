# Step 2 — User Flow — Dashboard

## Flow A — Manage-mode landing (refined)

```mermaid
flowchart TD
    A[User switches to Manage mode] --> B[Lands on Dashboard<br/>summarizing every permitted section]
    B --> C{Clicks a summary item}
    C -- Ungraded count --> D[Assignments: that submission queue]
    C -- Low-engagement course --> E[Courses: that course's detail]
    C -- Overdue team member --> F[Manager view: that person's progress]
    C -- Checklist item --> G[Onboarding: that step, or Org Settings]
```

## Flow B — Instructor dashboard states

```mermaid
flowchart TD
    A[Instructor Dashboard] --> B{Any activity yet?}
    B -- No --> C[Empty state: 'No submissions yet — once learners start, you'll see them here']
    B -- Yes --> D[Ungraded count, low-engagement courses, recent submissions]
```

## Flow C — Org Admin dashboard + checklist

```mermaid
flowchart TD
    A[Org Admin Dashboard] --> B[Org-wide stats: active users, completions]
    A --> C{Onboarding checklist items remain?}
    C -- Yes --> D[Checklist widget shown]
    C -- No --> E[Widget absent entirely]
    D --> F[Resume from checklist — Onboarding Flow B]
```

## Carried into Step 3 (Sitemap)

Instructor Dashboard (with empty state), Manager Dashboard (with empty state), Org Admin Dashboard (with/without checklist widget). Learner Dashboard already sited in the Shell module's sitemap — referenced, not re-listed.
