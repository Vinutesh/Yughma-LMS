# Information Architecture — Yughma LMS

This is the first-pass, full-breadth map of the product: every module, its screens, dialogs, components, core flow, dependencies, complexity, and architect notes. This is intentionally **shallow but complete** — the next step is to take each module through the full 9-step design sequence (see [PROJECT_VISION.md](PROJECT_VISION.md)) one at a time, in the order set by [ROADMAP.md](ROADMAP.md).

Complexity scale: **S** (few days of design work) · **M** (1-2 weeks) · **L** (2-4 weeks) · **XL** (a month+, likely needs sub-phases).

---

## 0. Cross-Cutting Shell (not a module — the frame every module lives in)

- **Screens/Regions:** App shell (sidebar + top bar), org switcher (for users in multiple orgs), global command palette / search, notification bell + panel, profile menu, global 404/500/maintenance pages, offline banner.
- **Reusable components:** Sidebar, Navbar, Breadcrumbs, Command palette, Search input, Notification bell, Avatar/menu, Toast/alert system, Skeleton loaders, Empty state, Error boundary, Permission-denied panel.
- **Notes:** This shell must be designed *before* any module screens, since every module's layout depends on it. Recommend building this as the first Figma deliverable and the first coded layout — treat it as its own mini design pass, not folded into Dashboard.

---

## 1. Authentication

- **Screens:** Login · Register (self-serve org creation) · Accept Invitation (invited-user path) · Forgot Password · Reset Password · Verify Email · MFA Setup · MFA Challenge · SSO Redirect/Login · Account Locked · Session Expired.
- **Modals:** MFA challenge (inline), Forced password change, Terms/privacy acceptance.
- **Components:** Auth card layout, Input, Button, OTP input, Password-strength meter, Alert banner.
- **Core flow:** Two distinct flows exist and must not be conflated — (a) **invite-based**: org admin invites → email → set password → onboarding; (b) **self-serve**: prospect signs up → creates org → becomes org admin → onboarding.
- **Dependencies:** Organization Management, Roles & Permissions.
- **Complexity:** M (L if SSO/SAML + MFA all ship in v1).
- **Architect notes:** Don't hardcode password-only auth even if SSO is v2 — enterprise deals stall without SAML/OIDC, and retrofitting auth is expensive. Design the login screen now with a "Continue with SSO" slot even if it's disabled at launch.

---

## 2. Onboarding *(added — not in original list, but required)*

- **Screens:** Org setup wizard (name, logo, domain, industry, size) · Role/persona selection · Invite team members · Setup checklist widget · Sample/starter course seed.
- **Modals:** Skip-step confirmation, Invite-more-later reminder.
- **Components:** Stepper, Progress checklist card, Invite input (multi-email).
- **Dependencies:** Organization Management, User Management, Courses (for seed content).
- **Complexity:** M.
- **Architect notes:** This is the single highest-leverage screen set for SaaS activation metrics. Must be skippable but persistent (a dismissible checklist on the admin dashboard) rather than a blocking wizard.

---

## 3. Dashboard

Not one screen — **role-based dashboards**, each answering a different question:

- **Learner Dashboard:** "What should I do next?" — continue learning, deadlines, recommended, streaks/progress.
- **Instructor Dashboard:** "What needs my attention?" — grading queue, course engagement, recent submissions.
- **Manager/Team-Lead Dashboard:** "How is my team doing?" — direct reports' progress, compliance status. (Corporate-specific — see open question on target segment.)
- **Org Admin Dashboard:** org-wide health — active users, completions, license usage.
- **Super Admin (platform) Dashboard:** Yughma-internal — tenant health, system status. Not customer-facing.
- **Components:** Stat card, Progress ring, Continue-learning card, Activity feed, Chart widgets, Quick-action row.
- **Dependencies:** Courses, Assignments, Analytics, Notifications.
- **Complexity:** L (5 distinct dashboards, each with its own data needs).
- **Architect notes:** This is a deliberate differentiator — most legacy LMS platforms (Moodle especially) ship one cluttered dashboard for everyone. Role-based dashboards should be called out as a selling point.

---

## 4. Organization Management

- **Screens:** Org list (Yughma internal ops only) · Org profile & settings · Branding (logo/colors/domain/white-label) · Departments/Groups/Cohorts · Org hierarchy tree · Sub-org/branch management (for franchise-style coaching institutes).
- **Modals:** Create org, Edit branding, Create department/cohort, Bulk import (CSV), Archive org confirm.
- **Dependencies:** User Management, Billing (future).
- **Complexity:** L.
- **Architect notes:** *Resolved:* hierarchy depth is admin-configurable at the data-model level, but v1 ships a fixed 2-level default UI (Department → Team) rather than a full hierarchy-configuration builder — see [ROADMAP.md](ROADMAP.md) and [CLAUDE.md](CLAUDE.md). Design the org tree data structure generically now; defer the "let admins add arbitrary levels" UI until a real customer needs it.

---

## 5. User Management

- **Screens:** User list (filterable table) · User profile (admin view) · User profile (self view) · Bulk import (CSV/SIS) · Deactivated/Archived users · Impersonation ("log in as," for support).
- **Modals:** Invite user, Edit user, Bulk role assign, Deactivate confirm, Merge duplicate accounts.
- **Dependencies:** Roles & Permissions, Organization Management.
- **Complexity:** L.
- **Architect notes:** Impersonation needs an audit-logged, clearly-banner'd mode ("Viewing as [user] — Exit") — a common compliance requirement that's easy to forget until an enterprise security review asks for it.

---

## 6. Roles & Permissions

- **Screens:** Role list · Role detail / permission-matrix editor · Custom role builder.
- **Modals:** Create role, Assign role to user, Permission-conflict warning.
- **Dependencies:** User Management.
- **Complexity:** L.
- **Architect notes:** Recommend RBAC with **custom roles and a permission matrix**, not a fixed enum of roles. Enterprise buyers routinely need odd roles ("can approve courses but not edit them"). This is far more expensive to retrofit than to build in from the start — worth the extra design time now.

---

## 7. Courses

- **Screens:** Course catalog (learner-facing, search/filter) · Course detail (learner) · Course builder/authoring (module & lesson tree) · Course settings (enrollment rules, visibility, prerequisites) · Course preview · My Courses · Draft/Published/Archived states.
- **Modals:** Create course, Duplicate course, Publish confirmation, Prerequisite picker, Enrollment-rule editor.
- **Dependencies:** Content Library, Lessons, Roles & Permissions.
- **Complexity:** XL — the core authoring surface of the product.
- **Architect notes:** The course builder (drag-and-drop module/lesson tree) is the single most complex UI in the app — closer to Notion's page tree than a form. Budget it as its own sub-phase with its own prototype round, not a single screen in the Courses pass.

---

## 8. Lessons

- **Screens:** Lesson editor (rich text/video/embed) · Lesson viewer (learner) · Lesson-type picker (Video/Text/PDF/SCORM/External link/Live session).
- **Modals:** Add lesson-type, Reorder confirmation.
- **Dependencies:** Content Library, Courses, SCORM/xAPI.
- **Complexity:** L.

---

## 9. Content Library

- **Screens:** Media library (grid/list) · Upload manager · Folder/tag organization · Content detail/preview · Reusable content blocks.
- **Modals:** Upload dialog, Move to folder, Delete confirm, Replace file.
- **Dependencies:** None — foundational; consumed by Lessons, Courses, Assignments.
- **Complexity:** M.
- **Architect notes:** Must be a shared asset manager (DAM-style), not per-course file storage — otherwise the same video gets re-uploaded across courses, multiplying storage cost at scale.

---

## 10. Assignments

- **Screens:** Assignment list (instructor) · Create/edit assignment · Submission inbox (grading queue) · Grading view (rubric-based) · Learner submission screen · Submission history/resubmit.
- **Modals:** Create assignment, Grade submission, Rubric builder, Extend deadline, Flag for review.
- **Dependencies:** Courses, Content Library, Notifications.
- **Complexity:** L.

---

## 11. Quizzes

- **Screens:** Quiz builder · Question bank library · Quiz-taking screen (learner) · Results/review · Question-type config (MCQ, T/F, fill-blank, matching, short answer).
- **Modals:** Add question, Import questions (CSV/QTI), Timer settings, Randomization settings, Retake settings.
- **Dependencies:** Courses, Assessments (shared question-bank engine), Content Library.
- **Complexity:** L.

---

## 12. Assessments

- **Screens:** Assessment scheduler · Proctoring settings · Results/analytics · Certification-eligibility view.
- **Dependencies:** Quizzes (shares the question-bank engine), Certificates, Skills.
- **Complexity:** L.
- **Architect notes:** Needs a clear line drawn against Quizzes: recommend **Quizzes = low-stakes/formative, embedded in a lesson; Assessments = high-stakes/summative** (proctored, time-boxed, attempt-locked, certificate-triggering), sharing the same question-bank data model so content isn't duplicated.

---

## 13. Learning Paths

- **Screens:** Path builder (sequenced courses/assessments) · Path catalog · Path detail (learner progress map) · My Paths.
- **Modals:** Add course to path, Set prerequisites, Completion-criteria editor.
- **Dependencies:** Courses, Certificates, Skills, Career Paths.
- **Complexity:** M.

---

## 14. Certificates

- **Screens:** Certificate template designer · Issued-certificates list · Public verification page (shareable link) · My Certificates (learner wallet).
- **Modals:** Design certificate, Issue manually, Revoke certificate.
- **Dependencies:** Courses / Learning Paths / Assessments (completion triggers).
- **Complexity:** M.
- **Architect notes:** A public, shareable verification URL (Credly-style) meaningfully increases perceived credential value — worth prioritizing over a purely internal PDF.

---

## 15. Reports

- **Screens:** Report builder · Prebuilt templates (completion, engagement, compliance) · Scheduled reports · Export center.
- **Dependencies:** Analytics (data layer); every learning module as a data source.
- **Complexity:** L.

---

## 16. Analytics

- **Screens:** Org-level analytics · Course analytics · Learner analytics · Instructor performance · Skill-gap analytics (overlaps module 25).
- **Dependencies:** feeds Reports, Dashboards, Recommendations, Skill Gap Analysis.
- **Complexity:** XL.
- **Architect notes:** Needs a dedicated event-tracking pipeline from day one, not on-the-fly aggregation over the transactional database — the latter stops working within the first few thousand active users.

---

## 17. Communities

- **Screens:** Discussion forums (per-course / org-wide) · Community feed · Groups · Thread detail · Moderation queue.
- **Modals:** Create post, Report content, Pin/lock thread.
- **Complexity:** L.
- **Architect notes:** High build cost, moderate purchase-decision impact for most B2B buyers. Recommend as a later phase rather than MVP unless a specific customer segment (community-led coaching institutes) demands it early.

---

## 18. Notifications

- **Screens:** Notification center (in-app) · Notification preferences.
- **Channels:** In-app, email now; push and Slack/Teams later.
- **Dependencies:** consumed by nearly every module.
- **Complexity:** M.
- **Architect notes:** Needs a shared notification/event service from the start — every module (grading, deadlines, publishing, invites) fires notifications, and building this ad hoc per module creates inconsistent UX and duplicated code.

---

## 19. Calendar

- **Screens:** Calendar view (month/week/agenda) · Event detail · Live-session scheduling (Zoom/Meet integration).
- **Dependencies:** Courses (deadlines), Assignments, Notifications.
- **Complexity:** M.

---

## 20. Skills

- **Screens:** Skills taxonomy management (admin) · Skill profile (learner) · Skill-to-course mapping.
- **Dependencies:** Courses, Assessments, Career Paths.
- **Complexity:** M.

---

## 21. Career Paths

- **Screens:** Career path builder (role → required skills → learning path) · Career path explorer (learner) · Progress view.
- **Dependencies:** Skills, Learning Paths.
- **Complexity:** L.
- **Architect notes:** A strong differentiator for corporate L&D (Degreed-style), largely irrelevant for academic institutions. Priority depends directly on the target-segment decision below.

---

## 22. Academies

- **Screens:** Academy list · Branded academy landing page · Content curation (admin).
- **Dependencies:** Courses, Learning Paths, Org branding.
- **Complexity:** M.
- **Architect notes:** Recommend modeling an "Academy" as a curated, brandable collection/portal (e.g., "Sales Academy") rather than a new content type — it's a view over existing Courses/Paths, not a parallel hierarchy.

---

## 23–25. AI Layer — *out of scope for now*

AI Assistant, AI Recommendations, and Skill Gap Analysis are deferred indefinitely per the decision in [CLAUDE.md](CLAUDE.md). Kept below for reference only — not scheduled in [ROADMAP.md](ROADMAP.md).

## 23. AI Assistant

- **Screens:** Contextual chat interface (embedded per page) · AI settings (admin: enable/disable, data-usage consent).
- **Dependencies:** heavy backend/AI infra dependency, minimal standalone UI.
- **Complexity:** L (mostly backend-driven).
- **Architect notes:** Scope is genuinely undefined right now — see open questions. "AI Assistant" could mean a course-authoring copilot, a learner support chatbot, or an admin analytics copilot, and each implies a completely different screen set.

---

## 24. AI Recommendations

- **Screens:** "Recommended for you" rail (dashboard/catalog) · Recommendation feedback (thumbs up/down).
- **Dependencies:** Analytics, Skills, Courses.
- **Complexity:** M (UI) / high backend complexity.

---

## 25. Skill Gap Analysis

- **Screens:** Individual skill-gap report · Team/org skill-gap heatmap · Gap-to-course recommendation.
- **Dependencies:** Skills, Career Paths, Analytics, Assessments.
- **Complexity:** L.

---

## 26. Settings

- **Screens:** Personal settings (profile, notifications, security, appearance/dark mode, language) · Org settings (general, branding, security policy, SSO config, integrations, billing) · Platform settings (super admin: feature flags, global config).
- **Complexity:** M.

---

## 27. Audit Logs

- **Screens:** Audit log viewer (filterable, exportable) · Log detail drawer.
- **Complexity:** S–M.
- **Architect notes:** Required for enterprise/SOC2 conversations. Cheap to build if it consumes the same event bus that powers Notifications — don't build a second, separate logging pipeline.

---

## 28. Billing

Split into two tiers given the decision to support self-serve signup (see [CLAUDE.md](CLAUDE.md)):
- **Phase 1 — Trial & Plan (lightweight):** plan picker (part of self-serve signup), trial countdown/banner, upgrade prompt. No payment collection yet.
- **Phase 4 — Full Billing:** Subscription management · Invoice history · Payment method · Seat/usage add-ons.
- **Complexity:** M (Trial & Plan) + L (Full Billing).
- **Architect notes:** Model `tenant`, `plan`, and `seat_limit` in the org data schema during Phase 0 regardless — both tiers depend on it, and retrofitting billing constraints onto an existing org model later is a painful migration.

---

## 29. SCORM / xAPI

- **Screens:** SCORM package upload · SCORM player runtime (learner) · xAPI statement viewer (admin/debug) · LRS connection settings.
- **Dependencies:** Content Library, Lessons.
- **Complexity:** L (mostly backend/runtime; thin UI surface).

---

## 30. Integrations

- **Screens:** Integration marketplace/directory · Per-integration config (OAuth connect) · Webhooks management · API key management.
- **Complexity:** L.
- **Architect notes:** Needed for enterprise sales (HRIS sync, SSO, Slack/Teams, Zoom, calendar sync). Build one generic integration framework, not a bespoke page per integration — the marginal cost of the 10th integration should be near zero.

---

## Screens/dialogs still missing from the original module list (recommended additions)

- **Global Search results page** (cross-module: courses, people, content).
- **Help / Support Center** (docs, contact support, submit ticket) — every SaaS product needs this and it's easy to forget until support tickets have nowhere to go.
- **Billing/legal pages** (Terms, Privacy, DPA acceptance) — needed for enterprise procurement even before Billing itself ships.
- **System status / maintenance page** — for planned downtime, expected at enterprise scale.

These are folded into the shell (Section 0) and Settings/Onboarding above rather than treated as standalone modules.

---

## Next step

Take modules through the full 9-step sequence one at a time, in the order defined in [ROADMAP.md](ROADMAP.md), starting with the Cross-Cutting Shell.
