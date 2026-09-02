# Roadmap — Module Sequencing

Trying to design (let alone build) all 30 modules from [MODULES.md](MODULES.md) at once is how LMS projects stall for years. This groups them into phases by dependency order and go-to-market value, so we always have a demoable, coherent product at the end of each phase.

**Scoping decisions this roadmap assumes** (see [CLAUDE.md](CLAUDE.md) for full detail):
- v1 target segment: **corporate / training companies**.
- Org hierarchy: configurable data model, but a fixed 2-level (Department → Team) default UI in v1.
- AI Assistant / AI Recommendations / Skill Gap Analysis: **out of scope**, not on this roadmap.
- Signup: **both** self-serve trial and sales-led/invite-only.

## Phase 0 — Shell & Foundation ✅ design pass complete (2026-08-05)
Cross-Cutting Shell · Authentication (both signup flows) · Onboarding · Organization Management · User Management · Roles & Permissions

*Nothing else is usable without these. This phase alone is worth a full design review before touching Courses.*

All six modules have been through Steps 1–4 (User Journey → Wireframes) — see [modules/](modules/) for each. Steps 5–9 deferred to the design team by default, per [CLAUDE.md](CLAUDE.md). Worth a full read-through/design-review pass across all six before Phase 1 starts, since several modules narrowed their own scope along the way (Organization Management, User Management, and Roles & Permissions all cut features from the original [MODULES.md](MODULES.md) sketch — see each module's `00-open-questions.md` for exactly what and why).

## Phase 1 — Core Learning Loop + Trial ✅ design pass complete (2026-08-05)
Dashboard (incl. Manager/Team-Lead view — real for corporate) · Content Library · Courses · Lessons · Assignments · Quizzes · **Trial & Plan selection** (lightweight subset of Billing — plan picker + trial countdown only, no invoicing/payment management yet)

*At the end of this phase we have a working, demoable, self-serve-able LMS: sign up, create a course, enroll a team, deliver content, collect submissions.*

All seven modules have been through Steps 1–4 — see [modules/](modules/). Notable calls made along the way (see each module's `00-open-questions.md` for full detail):
- **Quizzes and Assignments are deliberately split** — Quizzes (MCQ/True-False) are auto-graded; Assignments are the manually-graded, open-ended path. No rubric builder, no CSV question import, no fill-in-the-blank/matching in this pass.
- **Courses is flagged XL** in the original IA and still is — this pass gives it a real, usable design, but the module/lesson tree builder specifically deserves a second, deeper look (ideally with instructor feedback) before real development.
- **Dashboard refines a Shell-module decision**: Manage mode now lands on a role-based dashboard summary instead of jumping straight into a list screen — flagged explicitly since Shell's wireframes were already marked approved.
- **Trial & Plan has no payment collection** — it's a plan picker + countdown only; real billing is Phase 4.

### Build status (frontend, 2026-08-05)

**All seven modules of this phase are built and running** in `LMS/frontend` against the mock data layer, verified end-to-end in a real browser: Content Library, Courses, Lessons, Assignments, Quizzes, Dashboard, and Trial & Plan.

Decisions made during the build, worth confirming in review:
- **One dashboard per person, not a union of sections.** A multi-role account (the seeded Org Admin also holds `courses:manage`) would otherwise see Org Admin stats *and* a grading queue *and* a "no team members" empty state — recreating the cluttered-dashboard problem this module exists to avoid. Variant is picked by strongest permission: Org Admin → Instructor → Manager. Anything not surfaced stays one click away in the nav.
- **Manager dashboard scopes to the manager's own department**, not an org-wide roll-up. A manager with no department assigned sees the empty state rather than everyone.
- **Choosing a plan defers its state refresh until the confirmation is dismissed.** Refreshing immediately unmounted the trial-expired block mid-flow (that block stops applying the moment a plan exists), so the confirmation vanished before it could be read.
- **Trial-expired blocks the content area but leaves shell chrome usable** (profile menu, logout). This is the open question flagged in the module's Journey 3 — exactly how locked a non-admin's experience should get is still a design-review conversation.
- A **dev-only "Dev: trial" menu** in the top bar shifts the trial deadline between mid-trial / ending-soon / last-day / expired, since those states are otherwise unreachable without waiting real days. Same category as the existing dev role switcher — not for production.

Built beyond the original wireframes, because the designs implied them but named no screen:
- **Enrollment requests queue** (`/manage/enrollments`) — Courses' "Request approval" enrollment mode had no screen for the instructor to actually approve on.
- **Learner Assignments and Quizzes list screens** — both modules designed the detail/submission screens but no way for a learner to find their own work. These also added two Learning-mode nav items beyond the approved Shell wireframes (see `config/nav.ts`).
- **A Plan nav item** under Organization, gated to `settings:manage` — the plan screen was only reachable from Settings or the trial banner otherwise.

Deliberately simplified against the wireframes, worth a look in the design team's pass:
- Lesson reordering uses **up/down buttons, not drag handles** (`⋮⋮` in the wireframe) — drag-and-drop is a `@dnd-kit` follow-up.
- Rich-text editors are **plain textareas** — no `[B] [I] [H1]` toolbar yet (Tiptap is the planned swap).
- Video/PDF lessons show an **attachment placeholder, not a player/renderer** — real playback needs the file backend.
- File **uploads record metadata only** — no bytes are transferred, so previews are placeholders.

## Phase 2 — Assessment & Recognition ✅ design pass complete (2026-08-05)
Assessments · Learning Paths · Certificates · Skills

*Skills moves up from the original draft — it's load-bearing for the corporate L&D narrative (feeds Career Paths and manager-facing reporting).*

All four modules have been through Steps 1–4 — see [modules/](modules/). Notable calls:
- **Assessments is a high-stakes variant of Quizzes** (single attempt, passing score, scheduled window, certificate-triggering) rather than a parallel system — reuses the same question editor. Proctoring ships as a stored-but-inert toggle, not a working feature.
- **Learning Paths sequences existing Courses** rather than authoring new content — same "own the structure, not the content" principle as Course Builder → Lessons.
- **Certificates ships one fixed template**, no visual designer — but the public, no-login verification page (the real credibility payoff) is fully in scope.
- **Skills refines the Shell's Learning-mode nav** — adds a "My Skills" item, flagged explicitly since Shell's wireframes were already approved (same pattern as Dashboard's refinement in Phase 1).

### Build status (frontend, 2026-08-07)

**All four modules of this phase are built and running**, verified end-to-end in a real browser against a running dev server (login → action → assertion, not just typechecking): Assessments, Learning Paths, Certificates, Skills.

Decisions made during the build, worth confirming in review:
- **Assessments and Quizzes share one implementation**, parameterized by `kind: "quiz" | "assessment"` — one list screen, one builder, one attempt screen, each rendering kind-specific copy and fields (pass mark instead of retakes, availability window, proctoring toggle, certificate award). This is the "variant, not a parallel system" call from the design doc, carried into the code so the two can't drift apart.
- **One certificate-issuance function, four callers.** Course completion, assessment pass, path completion, and manual admin issue all route through a single `issueCertificate()` — it dedupes (re-completing a course never mints a second certificate for the same source) and generates the verification code. Verified: un-completing and re-completing a lesson on an already-finished course does not issue a duplicate.
- **Revoking a certificate keeps the record**, just flips a flag — the public verify link reports "revoked," never 404s, and the certificate drops out of the learner's own wallet immediately while staying in the admin's cross-org list.
- **A path can't be published while it contains an unpublished course** — blocks with a specific error naming which course, rather than letting learners hit a permanently-locked first step. The course picker also only offers published courses, so this is hard to trigger by accident.
- **Skill proficiency is a plain count of completed courses**, no levels or scores — matches the module's explicit scope cut. A skill with no relationship to the viewing learner (no enrollment, no completion) doesn't clutter their My Skills list; the full taxonomy is admin-only.
- The learner sidebar is now at **9 flat items**, four more than the originally-approved 5. The nav-review flagged after Phase 1 is now overdue — recommend doing it before Phase 3 adds Career Paths.

## Phase 3 — Enterprise & Growth ✅ design pass complete (2026-08-05)
Career Paths · Academies · Notifications · Calendar · Reports · Analytics · Audit Logs

*Career Paths/Academies promoted ahead of general engagement modules — they're differentiators for the confirmed corporate segment, not nice-to-haves.*

All seven modules have been through Steps 1–4 — see [modules/](modules/). Notable calls:
- **Career Paths is a navigation layer, not a new system** — maps target roles to Skills to existing content, no enrollment concept of its own. Added a "Career Paths" Learning-mode nav item.
- **Academies deliberately did NOT get a nav item** — after Dashboard, Skills, and Career Paths each added one, Academies surfaces as a filter inside the existing Courses Catalog instead, to avoid sidebar clutter. **A consolidated Shell nav review is recommended before Phase 4** — three additions since the original approval is enough to warrant revisiting the whole sidebar as one design pass rather than more one-off additions.
- **Reports and Analytics were both narrowed hard** — 3 fixed report templates (no custom builder, no scheduling), one tabbed Analytics screen with fixed charts (no self-serve query/chart building). Both are real, legitimate future products; neither is this pass's job.
- **Calendar's "live session" is a manual event with an optional link field** — no real Zoom/Meet integration until the Integrations module (Phase 4).

### Build status (frontend, 2026-08-07)

**All seven modules of this phase are built and running**, verified end-to-end in a real browser: Notifications, Calendar, Career Paths, Academies, Reports, Analytics, Audit Logs. A full regression pass across Phases 1 and 2's verification suites turned up no real regressions — the only two failures were stale test assertions expecting exact strings this phase intentionally changed (the "Teaching" nav heading, since renamed; see below).

Decisions made during the build, worth confirming in review:
- **The consolidated nav review flagged after Phase 1 happened now, ahead of schedule** — the learner sidebar had reached 9 flat items, so both sidebars are grouped into sections (Learning: Learn / My Work / My Progress; Manage: Content / Assess / Team / Organization) rather than one long list. Career Paths' own nav item landed inside this pass rather than as a 10th one-off addition.
- **Calendar scope differs by role, not just by permission gate.** An instructor's own manual event on their own course was invisible on their own calendar at first — the query scoped to "courses the viewer is enrolled in as a learner," and instructors aren't usually learner-enrolled in courses they teach. Fixed: learners see courses they're enrolled in; anyone with `courses:edit` sees every course in the org, since they're tracking commitments across what they teach, not what they're taking.
- **One notification fan-in function (`notify()`), called from every producing action** — grading, certificate issuance, enrollment decisions, role changes — same pattern as certificate issuance in Phase 2. Preferences are read but not yet enforced against a real email channel, since there's no email sending in this pass; the toggle exists and persists for when there is.
- **Compliance report approximates "mandatory training" as any course with a certificate attached** — there's no separate compliance flag in the data model, and a course an org bothers to certify is the closest existing signal for "this matters enough to track completion."
- **Learner progress bands (Analytics) are a heuristic, not a scored model** — on track / at risk / falling behind, based on lowest active-enrollment progress adjusted for how long they've been enrolled. Good enough to answer "who needs a nudge," explicitly not a self-serve analytics engine per the module's own scope cut.
- **Audit Log is gated on `roles:view`**, the same tier as Roles & Permissions, rather than a new dedicated permission — matches the module's "Org Admin only" call without adding a permission resource for a seven-action-type log.

Built beyond the original wireframes:
- **Analytics' trend lines and status bar chart** are small inline SVG components (`TrendLine`, `StatusBarChart`) rather than a charting library — the wireframes marked charts as placeholders pending real data shape, and now that the shape exists, these are deliberately minimal: single-hue magnitude trends, status-color-only for real state (on-track/at-risk/falling-behind), no library dependency for three fixed charts.

### Frontend security review (2026-08-08)

Manual review (no backend exists yet, so this covered client-side injection risk and access-control logic in the mock resource layer) found and fixed: `javascript:`-URL injection via user-entered lesson/calendar links, CSV formula injection in report/audit exports, and three IDOR-shaped gaps where direct-navigation calls (`getCourse`, `getAssignment`, `getMyQuizState`) skipped the enrollment/visibility checks their list-view counterparts already had. Full writeup, plus what's explicitly *not* fixable until the real backend exists (quiz answers currently ship to the client during an active attempt; there's no real tenant isolation because there's only one tenant) — see [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

## Phase 4 — Enterprise Operations ✅ design pass complete (2026-08-08)
Full Billing · SCORM/xAPI · Integrations · Full Settings

All four modules have been through Steps 1–4 — see [modules/](modules/) (24 through 27). Notable calls:
- **Full Billing has no real payment processor** — subscription lifecycle, invoices, payment method, and seat requests are all real UI over mock data, same "record intent, charge nothing" pattern Trial & Plan established in Phase 1. Builds directly on `Organization.plan` rather than inventing a parallel billing model.
- **SCORM/xAPI is a thin UI surface over what's mostly backend/runtime work**, per [MODULES.md](MODULES.md) §29 — but the sandboxed-player requirement is treated as load-bearing, not cosmetic, directly following from the frontend security review's SCORM/uploaded-content-is-code finding.
- **Integrations is one generic framework** (directory, config panel, webhooks, API keys), not a bespoke page per integration, per the architect note in [MODULES.md](MODULES.md) §30 — the 10th integration should cost a data row, not a new page.
- **Full Settings' Branding/Security/Data tabs** complete what Organization Management (Phase 0) and Academies (Phase 3) both explicitly deferred to "later."

### Build status (frontend, 2026-08-08)

**All four modules are built and running**, verified end-to-end in a real browser. A full regression pass across every earlier phase's verification suite (Phases 1–3 plus the security-fix suite) turned up no regressions.

Decisions and one real bug found during the build:
- **Same instructor-vs-learner scoping bug as Calendar (Phase 3), this time on the course Discussion link.** The link only rendered when the viewer had an *active learner enrollment* — but an instructor isn't necessarily enrolled as a learner in a course they created, so they couldn't reach their own course's Discussion. Same fix as before: visible to an active enrollment **or** `courses:edit`.
- **Org deletion's confirm flow is real (typed-name confirmation, a genuine inventory query for the numbers shown) but the final action deliberately refuses to touch this build's demo data** — clicking through shows an explicit message that this is UI-contract verification, not a live delete, rather than silently no-op-ing or, worse, actually deleting the seeded org and breaking every other verification suite.
- **Billing's seat limit / subscription status / next-invoice-date are set immediately on choosing a plan**, not deferred to actual trial-end the way the underlying `plan` field is — a Billing tab needs something to render in a demo without waiting out a real trial. The displayed copy still correctly says "takes effect when your trial ends"; this only affects what the mock has ready to show meanwhile.
- **The SCORM upload's "processing" state resolves via a client-side `setTimeout`**, not a real async job — there's no backend to run one. The lesson content type, `scormStatus` field, and the sandboxed player's isolation contract (see below) are the parts meant to survive into the real implementation unchanged.
- **Compliance report's "mandatory training" definition (any course with a certificate attached) is inherited from Phase 3** — unchanged here, just noting the same simplification applies wherever Full Billing/Settings touch certificate-bearing courses.

Security-relevant, built directly from the frontend security review's findings:
- **The SCORM player (`components/scorm/ScormPlayer.tsx`) sandboxes with `sandbox="allow-scripts"` only — deliberately without `allow-same-origin`.** For `srcDoc` content, adding `allow-same-origin` doesn't isolate the package; it grants it the *parent page's* origin (a well-known sandbox footgun), which would hand uploaded content exactly the DOM/cookie/session access this module exists to deny. Progress reporting goes through `postMessage`, validated by comparing `event.source` to the iframe's own `contentWindow` rather than trusting `event.origin` (which is `"null"` for an intentionally opaque-origin frame).
- **Webhook URLs go through the same `assertSafeUrl` validator** built for the lesson-link/calendar-link fixes — a `javascript:` webhook URL is rejected the same way a `javascript:` lesson link is.

**Communities' thread/post reads are enrollment-scoped**, closing the same missing-scope gap the security review fixed for courses/assignments/quizzes — `listCourseThreads`/`getThread` now 404 for anyone who isn't enrolled in the course or a `courses:edit` holder. Caught during this build, not the original review, since Communities didn't exist yet when that review ran; see [SECURITY_REVIEW.md](SECURITY_REVIEW.md)'s Phase 4/5 follow-up.

## Phase 5 — Community ✅ design pass complete (2026-08-08)
Communities

One thread/post model shared by per-course discussion and an org-wide feed, with human-only moderation (pin/lock/remove/report) — no auto-moderation, no rich media, no separate Groups concept (a course is the group). Kept last on purpose per [MODULES.md](MODULES.md) §17 — high build cost, moderate purchase-decision impact for most B2B buyers.

### Build status (frontend, 2026-08-08)

**Built and verified end-to-end**, including the full moderation loop (report → queue → dismiss/remove) and the pin/lock/locked-thread-blocks-replies behavior, tested across both the org-wide feed and a course-scoped Discussion. The enrollment-scoping fix noted under Phase 4's build status above lives here, since Communities is the module it applies to.

## Deferred indefinitely
AI Assistant · AI Recommendations · Skill Gap Analysis — out of scope per current decisions. Worth a fresh IA pass if/when this is revisited, since it may compose differently once real usage data exists to recommend against.

---

## Rationale for ordering
- **Shell before everything** — every other module's layout depends on it.
- **Auth/Org/User/Roles before Courses** — enrollment, visibility, and authoring permissions all hang off org hierarchy and RBAC; building Courses first would mean redesigning it once those land.
- **Content Library before Lessons/Courses** — both consume it; building it after would mean retrofitting upload flows into two screens instead of one.
- **A lightweight Trial/Plan flow moved into Phase 1** — self-serve signup without at least a plan/trial concept isn't really self-serve; but full invoicing/payment UI can safely wait until there are paying self-serve customers to bill.
- **Career Paths/Academies/Skills promoted** relative to the original draft, directly because the confirmed target segment is corporate L&D, where these are core value props rather than nice-to-haves.
- **Communities last** — highest build cost relative to weight in a typical corporate LMS purchase decision.
- **AI modules removed from the active roadmap** per the decision to skip AI for now — not deleted from [MODULES.md](MODULES.md), just not scheduled.
