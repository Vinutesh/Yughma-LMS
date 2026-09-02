# Step 4 — Wireframes — SCORM / xAPI

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Lesson editor — content type picker addition

```
  Content type
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │ Video   │ │ Text    │ │ File    │ │ Link    │ │ SCORM   │ │ Live    │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## SCORM upload state

```
  Upload SCORM package
  ┌──────────────────────────────────────────┐
  │  onboarding-scorm.zip                      │
  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  Processing...       │
  └──────────────────────────────────────────┘
```

## SCORM player (learner view) — sandboxed frame

```
  ← Course
  Onboarding Compliance Walkthrough
  ──────────────────────────────────────────────────────
  ┌──────────────────────────────────────────┐
  │ [ sandboxed frame — package content only ] │
  │                                            │
  │                                            │
  └──────────────────────────────────────────┘
  Progress reported by package: 60%
```

## xAPI Statement Viewer (Manage, read-only)

```
  xAPI Statements
  ──────────────────────────────────────────────────────
  Actor         Verb          Object                  Time
  ──────────────────────────────────────────────────────
  Jamie Lee      completed     Onboarding Walkthrough   Aug 7, 14:02
  Raj Patel      experienced   Sales Fundamentals SCO    Aug 6, 09:15
```

## LRS Connection Settings

```
  Settings → LRS Connection
  ──────────────────────────────────────────────────────
  Endpoint URL
  ┌──────────────────────────────────────────┐
  │ https://lrs.example.com/xapi               │
  └──────────────────────────────────────────┘
  Auth key
  ┌──────────────────────────────────────────┐
  │ ••••••••••••••                              │
  └──────────────────────────────────────────┘
  Not connected — this is stored only, no live sync yet.
                                        [ Save ]
```
