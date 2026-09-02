# Step 4 — Wireframes — Trial & Plan

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Trial-ending banner (in the shell, above the top bar — same family as the Offline banner)

```
┌──────────────────────────────────────────────────────────┐
│  5 days left in your trial — Choose a plan          ✕     │
├──────────────────────────────────────────────────────────┤
│  [ ...rest of shell renders normally underneath... ]      │
└──────────────────────────────────────────────────────────┘
```

## Trial status (in Settings, always present during trial)

```
  Settings → General
  ──────────────────────────────────────────────────────
  Plan: Free trial — 22 days left          [ Choose a plan ]
```

## Plan-comparison screen

```
  Choose a plan
  ──────────────────────────────────────────────────────
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Starter        │  │ Growth         │  │ Enterprise     │
  │ Up to 50 users │  │ Up to 500 users│  │ Unlimited       │
  │ Core LMS        │  │ + Reports/API  │  │ + SSO/SCIM      │
  │                  │  │                  │  │ + dedicated CSM│
  │ [ Choose ]       │  │ [ Choose ]       │  │ [ Contact sales]│
  └──────────────┘  └──────────────┘  └──────────────┘
```

**After choosing:**
```
┌──────────────────────────────────────────┐
│  You're on the Growth plan                │
│  ────────────────────────────────────────│
│  Takes effect when your trial ends         │
│  (in 22 days).                            │
│                        [ Done ]            │
└──────────────────────────────────────────┘
```

## Trial-expired block (Org Admin)

```
  Your trial has ended
  ──────────────────────────────────────────────────────
  Choose a plan to keep using Acme Corp's workspace.

  [ ...same plan cards as above, embedded directly... ]
```

Full-bleed, replaces the shell content area entirely — this is a hard stop for the Org Admin, not a dismissible banner.

## Trial-expired message (everyone else)

```
              Your organization's trial has ended
     An Org Admin needs to choose a plan to continue.
```
