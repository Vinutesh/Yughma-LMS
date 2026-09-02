# Step 4 — Wireframes — User Management

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Lives in the Shell's Manage-mode content area (sidebar/top bar already wireframed, not redrawn).

---

## Users list

```
  Users                                    [ Invite people ]
  [ Active ]  Deactivated
  ──────────────────────────────────────────────────────────
  Search...      Department ▾      Role ▾
  ──────────────────────────────────────────────────────────
  Name              Email                  Dept        Role
  ──────────────────────────────────────────────────────────
  Priya Sharma      priya@acmecorp.com     Sales—West  Instructor
  Raj Patel         raj@acmecorp.com       Engineering Learner
  Jamie Lee         jamie@acmecorp.com     —           Learner
  ...
```

Clicking a row opens the detail panel (below) sliding over the list, list stays scrolled to the same position underneath.

## User detail panel

```
                                    ┌──────────────────────────┐
                                    │  Priya Sharma          ✕  │
                                    │  priya@acmecorp.com       │
                                    │  ──────────────────────── │
                                    │  Role                     │
                                    │  ┌──────────────────┐     │
                                    │  │ Instructor      ▾ │     │
                                    │  └──────────────────┘     │
                                    │  Department / Team        │
                                    │  ┌──────────────────┐     │
                                    │  │ Sales — West    ▾ │     │
                                    │  └──────────────────┘     │
                                    │  Status: Active            │
                                    │  ──────────────────────── │
                                    │  Log in as this user       │
                                    │  Deactivate user            │
                                    └──────────────────────────┘
```

"Log in as this user" only appears for admins with that specific permission (Journey 4) — absent, not greyed out, for everyone else.

## Modal — Invite people

```
┌────────────────────────────────────────┐
│  Invite people                       ✕  │
│  ────────────────────────────────────── │
│  ┌──────────────────────────────────┐  │
│  │ priya@acmecorp.com    Learner ▾ ✕│  │
│  │ raj@acmecorp.com    Instructor ▾✕│  │
│  │ Add another email...             │  │
│  └──────────────────────────────────┘  │
│  Add to department/team (optional)      │
│  ┌──────────────────────────────────┐  │
│  │  Select...                    ▾  │  │
│  └──────────────────────────────────┘  │
│                                          │
│              [Cancel]  [ Send invites ] │
└────────────────────────────────────────┘
```

## Deactivate confirm

```
┌──────────────────────────────────────────┐
│  Deactivate Priya Sharma?                 │
│  ────────────────────────────────────────│
│  She'll lose access immediately. Her      │
│  history (completions, certificates,      │
│  submissions) is kept, and she can be     │
│  reactivated anytime.                     │
│                                            │
│           [Cancel]  [ Deactivate ]         │
└──────────────────────────────────────────┘
```

## Blocked state — last remaining Org Admin

```
┌──────────────────────────────────────────┐
│  Can't deactivate this user                │
│  ────────────────────────────────────────│
│  Priya is the only Org Admin. Assign        │
│  another admin before deactivating her.    │
│                                            │
│                        [ Got it ]          │
└──────────────────────────────────────────┘
```

## Impersonation banner (overlays the whole shell)

```
┌──────────────────────────────────────────────────────────┐
│  Viewing as Priya Sharma                          Exit →  │
├──────────────────────────────────────────────────────────┤
│  [ ...rest of shell renders normally as Priya would see it... ] │
└──────────────────────────────────────────────────────────┘
```

Same family as the Offline banner already wireframed in the Shell module — a persistent top strip, not a modal, since it needs to stay visible through arbitrary navigation while impersonating.
