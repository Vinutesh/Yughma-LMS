# Step 2 — User Flow — Content Library

## Flow A — Upload

```mermaid
flowchart TD
    A[Drag file onto grid, or Upload button] --> B[Tile appears immediately with progress state]
    B --> C[Upload completes]
    C --> D[Tile becomes clickable, prompts: add tags / folder? optional]
    D --> E[Done — sits in the grid like any other asset]
```

## Flow B — Picker mode (launched from Lessons)

```mermaid
flowchart TD
    A[Lesson builder: 'Add video/file'] --> B[Same library opens in picker mode<br/>tiles are selectable, not just viewable]
    B --> C{Pick existing, or upload new?}
    C -- Existing --> D[Select tile → 'Use this' → returns to lesson builder with it attached]
    C -- New --> E[Same Flow A upload, then auto-selected once done]
    E --> D
```

## Flow C — Manage / delete

```mermaid
flowchart TD
    A[Click a tile] --> B[Detail panel: preview, info, references, tags, folder]
    B --> C{Action}
    C -- Rename/retag/move --> D[Inline edit, saves immediately]
    C -- Replace file --> E[Upload new file, same asset ID — all references update]
    C -- Delete --> F{Referenced anywhere?}
    F -- Yes --> G[Blocked: list of courses/lessons using it]
    F -- No --> H[Confirm delete]
```

## Carried into Step 3 (Sitemap)

Library grid (with folder/tag filters), detail panel, upload flow (shared by both entry points), delete-blocked state.
