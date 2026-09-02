# Step 1 — User Journey — Calendar

## Journey 1 — Learner sees what's coming up

1. Opens Calendar (Learning mode) — month view by default, auto-populated with assignment/assessment due dates from their enrolled courses, plus any manual events (live sessions) an instructor added.
2. Switches to week or agenda view for a denser look at the near term.
3. Clicks a day's item → event detail: what it is, which course, and a direct link into the assignment/assessment/lesson itself.

## Journey 2 — Instructor adds a manual event

1. From Calendar (Manage mode, or from within a course), "Add event" — title, date/time, description, optional external link.
2. It appears on the calendar for everyone enrolled in that course automatically — no separate "invite" step, since course enrollment already defines the audience.

## Edge cases

- **A deadline changes** (e.g., an instructor extends an assignment due date, per [Assignments Journey 3](../09-assignments/01-user-journey.md)): the calendar entry updates automatically — it's a live reference to the deadline, not a copy.
- **Manual event's course is archived:** the event is archived along with it, same non-destructive-but-hidden pattern as everywhere else.

## What this rules in for Step 2 (User Flow)

- Deadlines are read-only calendar entries (derived, not directly editable here — go edit the assignment); manual events are the only thing actually created/edited on this screen.
