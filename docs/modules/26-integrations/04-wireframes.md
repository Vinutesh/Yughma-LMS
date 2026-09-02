# Step 4 — Wireframes — Integrations

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Integrations directory

```
  Integrations                    [ Webhooks ]  [ API Keys ]
  ──────────────────────────────────────────────────────
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Slack           │ │ Microsoft      │ │ Zoom           │
  │ Team notifs      │ │ Teams          │ │ Live sessions   │
  │ ● Connected      │ │ [ Connect ]    │ │ [ Connect ]     │
  │ [ Configure ]     │ │                │ │                │
  └──────────────┘ └──────────────┘ └──────────────┘
  ┌──────────────┐ ┌──────────────┐
  │ Google Calendar │ │ HRIS Sync       │
  │ [ Connect ]      │ │ [ Connect ]     │
  └──────────────┘ └──────────────┘
```

## Connect confirm

```
┌──────────────────────────────────────────┐
│  Connect Slack                          ✕ │
│  ────────────────────────────────────────│
│  You'll be redirected to Slack to           │
│  authorize Yughma LMS.                      │
│              [Cancel]  [ Continue ]         │
└──────────────────────────────────────────┘
```

## Config panel (generic, reused per integration)

```
  ← Integrations      Slack · Connected      [ Disconnect ]
  ──────────────────────────────────────────────────────
  Notify this channel on course completions
  ┌──────────────────────────────────────────┐
  │ #learning-wins                             │
  └──────────────────────────────────────────┘
                                        [ Save ]
```

## Webhooks

```
  Integrations   [ Webhooks ]  API Keys
  ──────────────────────────────────────────────────────
  URL                          Events              ⋯
  ──────────────────────────────────────────────────────
  https://hooks.acme.com/lms    Course published,    ⋯
                                 Certificate issued
  ──────────────────────────────────────────────────────
                                      [ + Add webhook ]
```

## Add webhook

```
┌──────────────────────────────────────────┐
│  Add webhook                            ✕ │
│  ────────────────────────────────────────│
│  URL                                        │
│  ┌──────────────────────────────────┐    │
│  └──────────────────────────────────┘    │
│  Events                                     │
│  [ ] Course published  [ ] Certificate issued│
│  [ ] Enrollment completed                    │
│              [Cancel]  [ Add ]              │
└──────────────────────────────────────────┘
```

## Signing secret shown once

```
┌──────────────────────────────────────────┐
│  Webhook created                         │
│  ────────────────────────────────────────│
│  Signing secret (copy it now — it won't    │
│  be shown again):                           │
│  whsec_8f2k...qx91                          │
│                              [ Done ]       │
└──────────────────────────────────────────┘
```

## API Keys

```
  Integrations   Webhooks   [ API Keys ]
  ──────────────────────────────────────────────────────
  Name              Key           Last used      ⋯
  ──────────────────────────────────────────────────────
  Zapier integration yu_••••8f2k   Aug 6           ⋯
  ──────────────────────────────────────────────────────
                                      [ + Generate key ]
```

## Key shown once

```
┌──────────────────────────────────────────┐
│  API key created                         │
│  ────────────────────────────────────────│
│  Copy it now — it won't be shown again:     │
│  yu_live_8f2kqx91mZpL...                    │
│                              [ Done ]       │
└──────────────────────────────────────────┘
```
