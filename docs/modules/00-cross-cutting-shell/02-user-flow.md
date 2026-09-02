# Step 2 — User Flow — Cross-Cutting Shell

Turns the journeys in [01-user-journey.md](01-user-journey.md) into concrete flows. Each flow below becomes one or more screens/states in Step 3 (Sitemap) and Step 4 (Wireframes).

## Flow A — Post-auth handoff into the shell

```mermaid
flowchart TD
    A[Auth success] --> B{First session ever?}
    B -- Yes --> C[Load shell, Learning mode, Home]
    B -- No --> D{Has Manage-mode access?}
    D -- No --> C
    D -- Yes --> E[Load shell, restore last-used mode]
    E --> F{Last mode had a deep position?<br/>e.g. mid-lesson, mid-grading}
    F -- Yes --> G[Restore to that exact screen]
    F -- No --> H[Land on mode's default home:<br/>Learning→Home, Manage→first permitted section]
```

- "Last-used mode" and "deep position" are both per-user session state, not per-org — two people in the same org can be in different modes simultaneously.
- Deep-position restore only applies within the same day/session window; a multi-day-old position falls back to the mode's default home rather than dropping someone back into a stale lesson.

## Flow B — Mode switch (Learning ↔ Manage)

```mermaid
flowchart TD
    A[User in Learning mode, viewing X] --> B[Clicks mode switch in sidebar header]
    B --> C[Shell stores current position for Learning mode]
    C --> D{Has this user visited Manage mode this session?}
    D -- Yes --> E[Restore last Manage-mode position]
    D -- No --> F[Land on first permitted Manage section]
    E --> G[Sidebar re-renders with Manage-mode sections]
    F --> G
    G --> H[User works in Manage mode]
    H --> I[Clicks mode switch again]
    I --> J[Restore stored Learning-mode position from step C]
```

- Only accounts with at least one of Instructor/Manager/Org Admin ever see this control — pure Learners skip this flow entirely (no switch renders).
- Switching modes never triggers a full page reload — it's a client-side context change, so it needs to feel instant, not like a navigation.

## Flow C — Sidebar navigation with live permission check

```mermaid
flowchart TD
    A[User clicks a sidebar item] --> B{Still permitted?<br/>re-checked at click time, not cached from login}
    B -- Yes --> C[Navigate, item highlights as active]
    B -- No, permission revoked mid-session --> D[Show Permission-Denied panel in content area]
    D --> E[Sidebar silently drops the now-unavailable item/section<br/>on next shell state refresh]
```

- This is the flow that implements the "role changed mid-session" edge case from Step 1. The permission check happens against a lightweight session/permissions cache that refreshes on navigation — not a full re-auth.

## Flow D — Global search / command palette

```mermaid
flowchart TD
    A[User presses shortcut or clicks search in top bar] --> B[Command palette opens, focus in input]
    B --> C[User types query]
    C --> D{Results found?}
    D -- Yes, grouped by type --> E[Courses / People / Content / Actions sections]
    D -- No --> F[Empty state: 'No results for “...”' + suggestion to check spelling/permissions]
    E --> G[User selects a result]
    G --> H[Palette closes, navigates to result<br/>result respects permission check from Flow C]
    B --> I[Esc or click-away]
    I --> J[Palette closes, no navigation]
```

- Results are permission-scoped at the query level (a Learner never sees an admin-only page as a search result) rather than shown-then-blocked — avoids leaking the existence of content they can't access.

## Flow E — Notifications

```mermaid
flowchart TD
    A[New event occurs elsewhere in the product] --> B[Notification service delivers to bell]
    B --> C[Bell shows unread badge count]
    C --> D[User clicks bell]
    D --> E[Panel opens: list of notifications, unread visually distinct]
    E --> F{User clicks a notification}
    F -- Yes --> G[Panel closes, navigates to the relevant screen<br/>e.g. a graded submission opens that submission]
    F -- No, clicks 'Mark all read' --> H[Unread state clears, panel stays open]
    E --> I{Any notifications at all?}
    I -- No --> J[Empty state: 'You're all caught up']
```

- The bell/panel is a shell-level component, but it's a *consumer* of the shared notification service scoped in [MODULES.md](../../MODULES.md) §18 — this flow only covers the shell-side display, not the service itself.

## Flow F — Session expiry mid-task

```mermaid
flowchart TD
    A[Session token expires while user is active] --> B{Unsaved state present?<br/>e.g. a form draft}
    B -- Yes --> C[Attempt local draft preservation before redirect]
    B -- No --> D[Redirect immediately]
    C --> D
    D --> E[Session Expired screen: 'Your session ended. Log in to continue.']
    E --> F[User re-authenticates]
    F --> G[Return to exact prior screen, draft restored if one was saved]
```

## Flow G — Logout

```mermaid
flowchart TD
    A[User opens profile menu] --> B[Clicks Log out]
    B --> C[Confirm only if unsaved work is detected]
    C -- No unsaved work --> D[Session cleared, redirect to Login]
    C -- Unsaved work --> E[Inline confirm: 'You have unsaved changes — log out anyway?']
    E -- Confirm --> D
    E -- Cancel --> A
```

## Flow H — Content-area error states (404 / permission-denied / offline)

```mermaid
flowchart TD
    A[User navigates to an invalid or inaccessible URL] --> B{What's wrong?}
    B -- Doesn't exist --> C[404 panel in content area, shell frame intact]
    B -- Exists but not permitted --> D[Permission-Denied panel in content area]
    B -- Network unreachable --> E[Offline banner, non-blocking, cached content-area state remains visible if any]
```

- In all three cases the sidebar and top bar keep rendering — the user is never stranded without a way to navigate elsewhere.

## Carried into Step 3 (Sitemap)

Every distinct box in the flows above that isn't just a transient state (palette open/closed) becomes a node in the sitemap: Home (Learning default), Manage-mode default landing, Session Expired, 404, Permission-Denied, Notification panel, Search results.
