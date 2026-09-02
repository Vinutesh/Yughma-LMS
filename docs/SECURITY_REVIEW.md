# Security Review — Frontend (2026-08-08)

Manual review of the frontend codebase (no backend exists yet, so this covers
what's actually reviewable: client-side injection risks, access-control logic
in the mock resource layer, dependency health, and secrets hygiene). The
`/security-review` skill couldn't run — this repo has no `origin` remote to
diff against — so this was done by direct inspection instead.

## Fixed

1. **Formula/`javascript:` URL injection in user-entered links** (`lib/api/validation.ts`, new). Lesson "External Link" URLs and Calendar event links were stored and rendered as `href`/`window.open` targets with no scheme validation — a `javascript:` value would execute on click. Fixed with `assertSafeUrl()`, applied at every write path (`courses.createLesson`/`updateLesson`, `calendar.createEvent`/`updateEvent`). Only `http:`/`https:` are accepted now.
2. **CSV formula injection** (`lib/api/resources/reports.ts`, `toCsv`). Course/user names flow into exported CSVs unescaped against the classic Excel/Sheets formula trick (a cell starting with `=`, `+`, `-`, or `@` executes as a formula on open). Fixed by prefixing such values with `'` before quoting.
3. **IDOR: invite-only/draft course content reachable by direct URL** (`courses.getCourse`). The Catalog list already filtered to `published && catalog` courses, but the detail fetch used by direct navigation didn't — a learner who knew or guessed a course ID could read full lesson content for a course never shown to them. Fixed: learner-context calls (`userId` passed) now 404 unless the course is catalog-visible or the caller has an enrollment record.
4. **IDOR: assignment instructions reachable for a course the learner isn't enrolled in** (`assignments.getAssignment`). Same pattern as #3, lower sensitivity (metadata, not full content). Fixed the same way.
5. **IDOR: quiz/assessment questions reachable for a course the learner isn't enrolled in** (`quizzes.getMyQuizState`). Same pattern; fixed with an enrollment check before returning quiz state.
6. **Dead, unscoped `certificates.getCertificate`** removed. It had no access check at all (no owner/org scoping) and no call site — deleted before something wires it up later and reintroduces an IDOR by accident.

Verified: `npx tsc --noEmit` clean, full Phase 1–3 verification suites re-run with no regressions, plus a targeted script confirming each fix actually blocks the exploit it targets and doesn't false-positive on legitimate use.

## Not fixed here — architectural, requires the real backend

**Quiz/assessment correct answers ship to the client during an active attempt.** `quizzes.getQuiz` returns `correctOptionId` on every question to any caller, including the learner's own quiz-taking screen. This can't be meaningfully fixed in the current mock — there's no server boundary; the entire dataset already lives in the browser's memory regardless of what any one function returns. **This is the most important thing to get right when the real backend is built**: a real API must serve two distinct shapes — an authoring shape (with answers, `courses:edit`-gated) and an attempt shape (options only, with correctness computed and checked server-side on submit, answers only appearing in a response once that specific attempt is submitted). Shipping the current shape verbatim to a real endpoint would let anyone read every correct answer from the browser's network tab before answering a single question. Flagged inline at the function with the same detail as here.

**No real tenant isolation exists, because there are no tenants yet.** Every "fix" above closes a gap in the mock's own internal logic, not a cross-org data leak — there's currently one seeded org, so the failure mode that matters (org A's session reading org B's data) can't even be exercised. When the backend is built, this becomes the single highest-priority piece: tenant scoping must live in query middleware, not in each resolver remembering a `where: { orgId }` clause. See the backend plan doc for how this is meant to be structured.

**Passwords are a hardcoded plaintext comparison** (`auth.ts`, `MOCK_PASSWORD`). Correct for a backend-less mock; must never be the pattern once real accounts exist — argon2id hashing, no plaintext comparison, ever.

**Client-persisted session/permissions are not a security boundary.** `sessionStore` persists the full permission list to localStorage so the mock UI can gate itself — this is fine today because there's no real server to protect. Once the backend exists, every mutation must re-check permissions server-side; the client's copy is a UI convenience, never the enforcement point.

## Follow-up from the Phase 4/5 build (2026-08-08)

Building on top of this review's IDOR-shaped pattern surfaced one more instance, found and fixed during the same build:

**Communities' course-discussion reads weren't enrollment-scoped.** `communities.listCourseThreads`/`getThread` returned a course's thread titles and post bodies to any authenticated org member, not just enrolled learners and the instructor — the same missing-scope shape as the `getCourse`/`getAssignment`/`getMyQuizState` gaps above. Fixed the same way: both now take `userId` and a `canModerate` flag, and 404 for anyone who's neither enrolled (status `active` or `completed` — a pending `requested` enrollment doesn't count, caught by a follow-up test after the first fix let a not-yet-approved learner through) nor holds `courses:edit`. Org-scope threads (the Community feed) are unaffected — that content is meant to be org-wide by design.

Two new pieces built specifically off this review's findings, worth noting as the pattern to preserve into the real backend:
- **`components/scorm/ScormPlayer.tsx`** sandboxes uploaded SCORM content with `sandbox="allow-scripts"` only, deliberately omitting `allow-same-origin` — for `srcDoc` content, that combination grants the *parent's* origin to the sandboxed frame rather than isolating it, which would undo the entire point. Postmessage validation checks `event.source` against the iframe's own `contentWindow`, not `event.origin` (which is the string `"null"` for an intentionally opaque-origin frame, and untrustworthy to compare as a string).
- **Webhook URLs (Integrations module) route through the same `assertSafeUrl` validator** built for the lesson-link/calendar-link fixes above — one validator, every user-entered URL that becomes a stored `href` or fetch target.

## Clean

- `npm audit` — 0 vulnerabilities
- No hardcoded secrets/API keys in the repo
- No `dangerouslySetInnerHTML`/`eval`/`new Function` usage on user-controlled input (the one `dangerouslySetInnerHTML` in `layout.tsx` is a static, hardcoded theme-init script)
- `target="_blank"` link already carries `rel="noreferrer"`
