# Open Questions — Courses

No blocking questions, but one scope call worth flagging clearly rather than burying: **[MODULES.md](../../MODULES.md) §7 flags Courses as XL complexity and explicitly recommends budgeting the course builder as its own sub-phase with a dedicated prototype round** — not something to fully resolve inside one Steps-1–4 pass. This pass gives it a real, usable first design (enough to build against), but the module/lesson tree editor specifically should get a second, deeper look — ideally with actual instructor feedback — before it's built for real. Flagging in writing rather than stopping to ask, since it's not blocking, just worth knowing.

## Scope narrowing applied

- **My Courses and Catalog are one screen, two tabs** — not two separate pages — same tabbed pattern as Organization Management's Settings.
- **Course Settings (enrollment rules, visibility, prerequisites) is a tab inside the Course Builder**, not a separate screen — prerequisite picker and enrollment-rule editor are inline sections of that tab, not their own modals/screens.
- **"Course preview" and the learner-facing "Course detail" screen are the same screen** — an instructor previewing their own course sees exactly what a learner would see, just with an "Editing" banner and a way back to the builder. No separate preview-only screen to maintain.
- **Duplicate course is a lightweight inline action** (list row → "Duplicate" → immediately creates a Draft copy, no modal) rather than a dialog with options — the common case (just copy it, then edit the copy) doesn't need a form in front of it.
