# Open Questions — Analytics

No blocking questions — narrowing applied:

- **One screen, 3 tabs** (Org Overview, Courses, Learners) rather than the 4 separate screens in [MODULES.md](../../MODULES.md) §16 — Instructor Performance folds into the Courses tab (engagement/completion by course naturally surfaces which courses are working) rather than being its own view. Same tabbed-screen instinct used throughout this design (Organization Management, Courses, etc.).
- **Trend charts, not a full self-serve analytics engine** — a handful of fixed, well-chosen charts per tab (completion trend, engagement trend, top/bottom courses) rather than a build-your-own-chart tool. That's a legitimate future product (and the eventual data-pipeline architect note from [MODULES.md](../../MODULES.md) §16 still applies for whoever builds this), but not this pass's job.
- **Relationship to Dashboard:** Dashboard (already designed) is the daily "what needs attention" glance; Analytics is the deliberate, sit-down-and-look-at-trends destination. Different job, different cadence of use — worth keeping distinct rather than merging.
