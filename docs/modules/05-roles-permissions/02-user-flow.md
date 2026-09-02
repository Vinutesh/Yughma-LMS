# Step 2 — User Flow — Roles & Permissions

## Flow A — Create a custom role

```mermaid
flowchart TD
    A[Roles list → Create role] --> B[Name + starting point:<br/>Clone from existing role (pre-selected) / Start blank]
    B --> C[Permission matrix editor opens for the new role]
    C --> D[Toggle permissions per category × action]
    D --> E[Save]
    E --> F[Role appears in list, assignable from User Management]
```

## Flow B — Edit a role in use

```mermaid
flowchart TD
    A[Roles list → click a custom role] --> B{Assigned to anyone?}
    B -- Yes --> C[Matrix editor opens with persistent banner:<br/>'Assigned to N people — changes apply immediately']
    B -- No --> D[Matrix editor opens, no banner]
    C --> E[Toggle permissions]
    D --> E
    E --> F[Save — takes effect immediately, no extra confirm]
```

## Flow C — Self-lockout prevention

```mermaid
flowchart TD
    A[Admin editing their own role] --> B{Would this save remove their own Roles-management permission?}
    B -- Yes --> C[Blocked: 'You can't remove your own ability to manage roles.']
    B -- No --> D[Saves normally]
```

## Flow D — Delete a custom role

```mermaid
flowchart TD
    A[Roles list → delete a custom role] --> B{Assigned to anyone?}
    B -- Yes --> C[Blocked: shortcut list of affected people<br/>'Reassign these N people to a different role first']
    B -- No --> D[Confirm delete]
```

## Carried into Step 3 (Sitemap)

Roles list, permission matrix editor (shared by view and edit, view is just a read-only render of the same layout), create-role modal, and the two blocked-state messages.
