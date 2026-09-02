# Step 2 — User Flow — Onboarding

Turns [01-user-journey.md](01-user-journey.md) into concrete flows.

## Flow A — The wizard itself

```mermaid
flowchart TD
    A[Signup succeeds] --> B[Step 1: Org basics]
    B -- Skip --> F[Land in shell, checklist has: Org basics, Persona, Invite team]
    B -- Continue --> C[Step 2: What you're using it for]
    C -- Skip --> F2[Land in shell, checklist has: Persona, Invite team]
    C -- Continue --> D[Step 3: Invite your team]
    D -- Skip --> F3[Land in shell, checklist has: Invite team]
    D -- Send invites --> E[Step 4: You're set]
    F --> Z[Shell — Home, checklist widget visible]
    F2 --> Z
    F3 --> Z
    E --> Z
```

- Every step's "skip" drops straight to the shell rather than advancing to the next step — skipping is an exit, not a fast-forward, since the remaining steps are better surfaced later via the checklist than forced through in one sitting.
- Only Step 4 has no skip — it's just a confirmation, there's nothing left to skip.

## Flow B — Resuming from the checklist

```mermaid
flowchart TD
    A[Org Admin sees checklist widget on Home] --> B{Which item do they click?}
    B -- Org basics --> C[Opens Organization Management's own org-settings screen<br/>pre-scrolled to the relevant fields — NOT a standalone onboarding form]
    B -- Persona --> D[Small standalone prompt, same chip-picker as Step 2]
    B -- Invite team --> E[Opens the same multi-email invite screen from Step 3]
    C --> F[On save, checklist item marked done]
    D --> F
    E --> F
    F --> G{All items done?}
    G -- Yes --> H[Checklist widget dismisses itself automatically]
    G -- No --> A
```

- Confirms the Step 1 journey note: re-opening "Org basics" from the checklist routes into the real Organization Management screens, not a onboarding-only duplicate.
- The checklist auto-dismissing once everything's done (vs. requiring a manual close) matters — an Org Admin who did everything shouldn't have a stale "finish setup" nag lingering.

## Flow C — Manual dismissal

```mermaid
flowchart TD
    A[Org Admin clicks 'Dismiss' on checklist widget] --> B[Confirm: 'You can always finish this from Settings later']
    B -- Confirm --> C[Widget hidden permanently for this org]
    B -- Cancel --> A
```

- A lightweight confirm, not a full modal — this is a low-stakes action (nothing is deleted, just hidden), so a heavy confirmation would be overkill.

## Carried into Step 3 (Sitemap)

Four wizard-step screens + the checklist widget (a Dashboard-module component, referenced here but not owned by this module) + the dismiss-confirm micro-interaction.
