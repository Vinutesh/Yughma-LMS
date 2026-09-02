# Step 2 — User Flow — User Management

## Flow A — Invite people

```mermaid
flowchart TD
    A[Users list → Invite people] --> B[Multi-email input, role per email, optional dept/team]
    B --> C{Any email already a member?}
    C -- Yes --> D[Inline 'Already a member' on that chip, others unaffected]
    C -- No --> E[Send]
    E --> F[Invitees receive email → Authentication Accept Invitation flow]
```

## Flow B — Manage existing user

```mermaid
flowchart TD
    A[Users list] --> B[Click a row]
    B --> C[Detail panel opens over the list]
    C --> D{Action}
    D -- Change role --> E[Dropdown of existing roles, save]
    D -- Change dept/team --> F[Dropdown sourced from Organization Management, save]
    D -- Deactivate --> G{Is this the org's only Org Admin?}
    G -- Yes --> H[Blocked: 'Assign another admin first']
    G -- No --> I[Confirm dialog → status flips to Deactivated]
    D -- Log in as --> J{Permitted?}
    J -- No --> K[Action not shown at all]
    J -- Yes --> L[Enters product as user, persistent 'Viewing as... Exit' banner]
    L --> M[Exit → back to own session, same place]
```

- "Log in as" not being shown at all (rather than shown-but-disabled) for unpermitted admins matches the same principle already established in the Shell module — absence over a disabled/locked control.

## Flow C — Deactivated view

```mermaid
flowchart TD
    A[Users list] --> B[Filter: Active / Deactivated]
    B -- Deactivated --> C[List shows deactivated users, greyed row treatment]
    C --> D[Click row → same detail panel, 'Reactivate' replaces 'Deactivate']
```

## Carried into Step 3 (Sitemap)

One list screen (with an Active/Deactivated filter, not a separate screen), one detail panel, one invite modal, one deactivate-confirm, one blocked-state message, and the impersonation banner.
