# Step 1 — User Journey — Content Library

Persona: **Instructor** (or anyone authoring content), in Manage mode → Teaching → Content Library.

## Journey 1 — Uploading and organizing

1. Opens Content Library, sees a grid of everything already uploaded org-wide (not per-course — this is the shared library the DAM note calls for).
2. Uploads a file (drag-drop or picker) — video, PDF, image, or a generic doc. Upload shows inline progress on the grid tile itself, not a separate progress screen.
3. Tags it and/or files it into a folder at upload time (both optional — an untagged, unfoldered upload is still fully usable, just less organized).
4. Later, filters the grid by folder or tag to find it again, or uses search.

## Journey 2 — Using library content from inside a course/lesson

1. While building a lesson (Lessons module, out of scope here), the "Add video/file" action opens this same library in a picker mode rather than a separate per-course upload flow.
2. Picks an existing asset, or uploads a new one right there (same upload flow, just launched from a different entry point) — either way it lands in the one shared library afterward.
3. This is the concrete payoff of the DAM approach: the same onboarding welcome video, uploaded once, gets reused across 5 courses without 5 separate files bloating storage.

## Journey 3 — Managing existing content

1. Clicks a tile, opens the detail panel: preview, file info (size, type, uploaded by/when), which courses/lessons currently reference it, tags, folder.
2. Can rename, retag, move to a different folder, replace the underlying file (same asset ID, new bytes — anything referencing it updates automatically), or delete.
3. Deleting something still referenced by a live course is blocked, not silently allowed — same "don't orphan things" instinct as Organization Management's department archiving, applied to content instead of people.

## Edge cases

- **Uploading a duplicate of something already in the library:** no automatic dedup detection in this pass (that's a nice-to-have, not core) — just flagged as a known gap, not designed around.
- **Very large file upload (e.g., a long video):** progress needs to survive navigating away from the library grid and coming back — not examined in depth here (a technical/backend concern more than a screen-design one), but the tile-level progress affordance should be built assuming uploads are backgroundable.
- **Deleting something referenced by content:** blocked with a list of what's using it, same shared pattern as Roles & Permissions' "can't delete, still assigned" block.

## What this rules in for Step 2 (User Flow)

- One upload flow, reused whether entered from the library grid directly or from within a lesson-builder picker.
- Delete is blocked (with a reference list), not a soft-archive — content doesn't carry the same "keep for reporting history" reasoning departments/roles do.
- The picker-mode entry point needs to feel like the same library, not a stripped-down clone.
