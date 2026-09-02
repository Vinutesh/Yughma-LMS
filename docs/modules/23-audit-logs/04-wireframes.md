# Step 4 — Wireframes — Audit Logs

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

## Audit Log viewer

```
  Audit Log                                    [ Export CSV ]
  ──────────────────────────────────────────────────────
  Actor: All ▾    Action: All ▾    Date range: Last 30 days ▾
  ──────────────────────────────────────────────────────
  Time         Actor          Action              Target
  ──────────────────────────────────────────────────────
  Aug 5, 10:02  Priya Sharma    Changed role         Raj Patel
  Aug 5, 09:40  Priya Sharma    Logged in as          Jamie Lee
  Aug 4, 16:15  System           Course archived       Data Fundamentals
```

## Detail drawer — role change

```
                              ┌────────────────────────────┐
                              │  Changed role             ✕ │
                              │  ──────────────────────────│
                              │  Aug 5, 10:02am              │
                              │  Actor: Priya Sharma          │
                              │  Target: Raj Patel            │
                              │  Learner → Instructor          │
                              └────────────────────────────┘
```

## Detail drawer — impersonation entry

```
                              ┌────────────────────────────┐
                              │  Logged in as              ✕ │
                              │  ──────────────────────────│
                              │  Aug 5, 09:40am               │
                              │  Impersonating admin:         │
                              │  Priya Sharma                 │
                              │  Impersonated user:           │
                              │  Jamie Lee                    │
                              └────────────────────────────┘
```
