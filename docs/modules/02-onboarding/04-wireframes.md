# Step 4 — Wireframes — Onboarding

Markdown/ASCII per the standing note in [CLAUDE.md](../../CLAUDE.md) (Figma MCP quota exhausted). All 4 steps share one stepper shell: progress dots, step content, and a footer with "Skip for now" (low-emphasis, left) and the primary action (right) — the skip is always visible but never the visually dominant choice.

---

## Step 1 — Org basics

```
┌──────────────────────────────────────────────┐
│   ● ─ ○ ─ ○ ─ ○           Step 1 of 4         │
│                                                │
│   Let's set up your organization              │
│   ──────────────────────────────────────────  │
│   Organization name                           │
│   ┌──────────────────────────────────────┐    │
│   │  Acme Corp                            │    │
│   └──────────────────────────────────────┘    │
│   Logo (optional)          Industry            │
│   ┌───────────┐            ┌────────────────┐ │
│   │  Upload    │            │  Select...  ▾  │ │
│   └───────────┘            └────────────────┘ │
│   Organization size                            │
│   ┌──────────────────────────────────────┐    │
│   │  Select a range...                 ▾  │    │
│   └──────────────────────────────────────┘    │
│                                                │
│   Skip for now                  [ Continue → ]│
└──────────────────────────────────────────────┘
```

---

## Step 2 — What you're using it for

```
┌──────────────────────────────────────────────┐
│   ● ─ ● ─ ○ ─ ○           Step 2 of 4         │
│                                                │
│   What will you use Yughma for?               │
│   Pick what fits best — helps us tailor        │
│   what you see first.                         │
│   ──────────────────────────────────────────  │
│   ┌────────────────┐  ┌────────────────────┐ │
│   │ Onboard new     │  │ Upskill my team     │ │
│   │ hires           │  │                     │ │
│   └────────────────┘  └────────────────────┘ │
│   ┌────────────────┐  ┌────────────────────┐ │
│   │ Sell training   │  │ Something else      │ │
│   │ to clients      │  │                     │ │
│   └────────────────┘  └────────────────────┘ │
│                                                │
│   Skip for now                  [ Continue → ]│
└──────────────────────────────────────────────┘
```

Chips are single-select, large tap targets (this is filed under "quick decisions," not a form field).

---

## Step 3 — Invite your team

```
┌──────────────────────────────────────────────┐
│   ● ─ ● ─ ● ─ ○           Step 3 of 4         │
│                                                │
│   Invite your team                            │
│   They'll join as Learners — you can change    │
│   roles anytime from Users & Roles.           │
│   ──────────────────────────────────────────  │
│   ┌──────────────────────────────────────┐    │
│   │  priya@acmecorp.com ✕                 │    │
│   │  raj@acmecorp.com ✕                   │    │
│   │  Add another email...                 │    │
│   └──────────────────────────────────────┘    │
│                                                │
│   Skip for now              [ Send invites → ]│
└──────────────────────────────────────────────┘
```

Each chip in the input is individually removable (✕). Invalid email formats get inline validation directly on that chip, not a form-wide error banner.

---

## Step 4 — You're set

```
┌──────────────────────────────────────────────┐
│   ● ─ ● ─ ● ─ ●           Step 4 of 4         │
│                                                │
│              ✓  You're all set                │
│   ──────────────────────────────────────────  │
│   ✓  We've added a sample course so you       │
│      can see how it works                     │
│   ✓  2 invites are on their way                │
│                                                │
│   Anything you skipped will stay handy in     │
│   a checklist on your Home.                   │
│                                                │
│              [    Go to my Home    ]          │
└──────────────────────────────────────────────┘
```

The two confirmation lines are conditional — "invites on their way" only appears if Step 3 wasn't skipped; if it was, that line is simply absent rather than shown as "0 invites sent."

---

## Checklist widget (sketch only — owned by the Dashboard module)

Shown on the Org Admin's Home when any step was skipped:

```
┌──────────────────────────────────────┐
│  Finish setting up Acme Corp      ✕   │
│  ──────────────────────────────────── │
│  ○ Add your org logo & industry        │
│  ○ Tell us what you're using this for  │
│  ○ Invite your team                    │
└──────────────────────────────────────┘
```

Each row routes per [02-user-flow.md](02-user-flow.md) Flow B — "org logo & industry" opens Organization Management's settings, the other two reopen the relevant wizard step directly. The ✕ triggers the dismiss-confirm micro-interaction (Flow C). Widget disappears automatically once every row is checked off.

## What's intentionally not built here

- No separate "invite sent successfully" screen — confirmed inline within Step 4 itself.
- No progress-bar-only alternative considered — 4 discrete dots were chosen over a continuous bar since the count (4 total, always known upfront) is worth showing explicitly.
