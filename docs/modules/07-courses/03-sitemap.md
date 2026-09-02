# Step 3 — Sitemap — Courses

```mermaid
flowchart TD
    LearnerCourses[Courses — Learning mode<br/>My Courses / Catalog tabs] --> Detail[Course detail<br/>= instructor preview, same screen]
    Detail --> LessonView[Lessons module — out of scope here]

    InstructorList[Courses — Manage mode list] --> Builder[Course Builder]
    InstructorList --> Detail

    Builder --> ContentTab[Tab: Content — module/lesson tree]
    Builder --> SettingsTab[Tab: Settings — visibility, enrollment, prerequisites]

    Builder --> PublishBlocked[Blocked: zero lessons]
    Builder --> PublishConfirm[Publish confirm]
    InstructorList --> ArchiveWarning[Archive warning]
    SettingsTab --> CycleGuard[Prerequisite cycle guard]
```

## Notes

- **5 real screens** (Learner Courses, Course detail/preview, Instructor Courses list, Course Builder with its 2 tabs) **+ 4 inline states** — small for an XL-flagged module, deliberately, per the scope note in [00-open-questions.md](00-open-questions.md).
- Course detail doing double duty (learner view / instructor preview) is the single biggest scope-reduction lever here — worth remembering if a future pass finds instructors need meaningfully different information than learners see.

## Carried into Step 4 (Wireframes)

Learner Courses (both tab states), Course detail, Instructor Courses list, Course Builder (Content tab), Course Builder (Settings tab), the 4 inline states.
