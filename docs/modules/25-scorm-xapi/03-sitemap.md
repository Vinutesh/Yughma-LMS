# Step 3 — Sitemap — SCORM / xAPI

```
Lessons (existing module)
└── Lesson editor
    └── Content type picker: + SCORM package

Lesson viewer (learner, existing route)
└── SCORM content type -> sandboxed player

Manage
└── xAPI Statements (new, Org Admin) — read-only viewer

Settings
└── LRS Connection (new tab) — endpoint + key form
```

No new Learning-mode nav item — SCORM is a lesson content type, not a destination of its own; xAPI/LRS live inside existing Manage/Settings surfaces.
