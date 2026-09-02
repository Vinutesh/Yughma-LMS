# Step 2 — User Flow — Organization Management

## Flow A — Settings: General

```mermaid
flowchart TD
    A[Settings → General tab] --> B[Fields pre-filled from Onboarding or blank]
    B --> C[Edit inline]
    C --> D[Save]
    D --> E{Onboarding checklist item still open?}
    E -- Yes --> F[Mark 'Add your org logo & industry' done]
    E -- No --> G[No-op]
```

## Flow B — Departments & Teams

```mermaid
flowchart TD
    A[Settings → Departments & Teams tab] --> B{Any departments yet?}
    B -- No --> C[Empty state: 'Create department']
    B -- Yes --> D[List of departments, expandable to show teams]
    C --> E[Create department modal: name]
    D --> F{Action on a department}
    F -- Add team --> G[Create team modal: name, parent department pre-filled]
    F -- Rename --> H[Inline rename]
    F -- Archive --> I[Confirm: 'Archive Sales? Members keep their history, but this stops appearing in new assignments.']
    E --> D
    G --> D
    H --> D
    I -- Confirm --> D
```

- Archive confirm explicitly states what stays intact (history) vs. what changes (no longer usable for new assignments) — a generic "Are you sure?" wouldn't communicate that this is non-destructive.
- Member counts shown per department/team are read-only here; clicking a count routes to User Management's filtered user list (out of scope for this module's own flow).

## Carried into Step 3 (Sitemap)

One Settings screen, two tabs (General, Departments & Teams), plus two small modals (Create department, Create team) and one shared archive-confirm pattern.
