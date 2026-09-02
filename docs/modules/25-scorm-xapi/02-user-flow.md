# Step 2 — User Flow — SCORM / xAPI

## Flow A — Upload a SCORM lesson

```mermaid
flowchart TD
    A[Lesson editor: pick 'SCORM package'] --> B[Upload .zip]
    B --> C[Processing state shown]
    C --> D[Ready -> lesson saved like any other type]
```

## Flow B — Take a SCORM lesson

```mermaid
flowchart TD
    A[Learner opens SCORM lesson] --> B[Sandboxed iframe player loads package]
    B --> C[Package reports progress/score via postMessage]
    C --> D[Lesson marked complete, same model as other content types]
```

## Flow C — Admin xAPI/LRS

```mermaid
flowchart TD
    A[Manage: xAPI Statement Viewer] --> B[Read-only list of statements]
    A2[Settings: LRS Connection] --> B2[Endpoint + key form, saved but inert]
```

## Carried into Step 3 (Sitemap)

SCORM upload (inside Lesson editor), sandboxed SCORM player, xAPI Statement Viewer, LRS Connection Settings.
