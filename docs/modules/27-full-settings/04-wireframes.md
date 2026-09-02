# Step 4 — Wireframes — Full Settings

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Branding tab

```
  Settings   General  Depts & Teams  Plan  Billing  [ Branding ]  Security  Data
  ──────────────────────────────────────────────────────
  Logo
  ┌──────────┐
  │  [none]   │   [ Upload ]
  └──────────┘
  Accent color
  ┌────┐
  │ ██ │  #4A4AC4        [ Change ]
  └────┘

  Preview
  ┌──────────────────────────────────────────┐
  │ ██ Acme Corp                               │
  └──────────────────────────────────────────┘
                                        [ Save ]
```

## Security tab

```
  Settings   ...  [ Security ]  Data
  ──────────────────────────────────────────────────────
  Session timeout
  ┌────────────┐
  │ 8 hours   ▾ │
  └────────────┘

  Require SSO for all logins        [ ]
  Inert until an SSO integration is connected — see Integrations.
                                        [ Save ]
```

## Data tab

```
  Settings   ...  [ Data ]
  ──────────────────────────────────────────────────────
  Export all organization data
  Everything — users, courses, certificates, audit log.
                                        [ Request export ]

  ──────────────────────────────────────────────────────
  Danger zone
  Delete this organization
  Permanently removes 4 users, 3 courses, 2 certificates.
  This cannot be undone.
                                        [ Delete organization ]
```

## Delete organization (confirm)

```
┌──────────────────────────────────────────┐
│  Delete Acme Corp?                        │
│  ────────────────────────────────────────│
│  This permanently removes:                  │
│  • 4 users                                  │
│  • 3 courses                                │
│  • 2 certificates                           │
│                                            │
│  Type "Acme Corp" to confirm.               │
│  ┌──────────────────────────────────┐    │
│  └──────────────────────────────────┘    │
│              [Cancel]  [ Delete forever ]   │
└──────────────────────────────────────────┘
```
