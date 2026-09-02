# Step 1 — User Journey — Academies

## Journey 1 — Org Admin curates one

1. Manage mode → Organization → Academies → "Create."
2. Names it ("Sales Academy"), writes a short description, uploads a hero image, adds existing Courses/Paths to it via a picker (same picker pattern as Learning Paths).
3. Publishes — now appears as a section in the learner-facing Courses Catalog.

## Journey 2 — Learner discovers one

1. In Courses (Catalog tab), sees an "Academies" filter/section alongside the regular course grid — clicking "Sales Academy" filters the catalog to just that collection, with the academy's description/hero shown at the top.
2. Enrolling in a course from within an academy view works exactly like enrolling from the regular catalog (Courses Journey 1) — Academies is a lens over the catalog, not a separate enrollment path.

## Edge cases

- **A course inside an academy gets archived:** same "don't orphan" pattern — it simply drops out of the academy's list, no broken reference shown.

## What this rules in for Step 2 (User Flow)

- Academy browsing is a filtered view of the existing Catalog, not a new destination with its own enrollment logic.
