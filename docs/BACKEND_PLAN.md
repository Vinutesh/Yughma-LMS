# Backend Plan

The frontend (`LMS/frontend`) is complete against a mock data layer — all 28
modules across Phases 0–5, verified end-to-end in a real browser. Nothing in
it is wired to a real server. This document is the plan for building the
backend that replaces that mock layer, one resource-client file at a time,
without the frontend ever going dark.

## Stack

**Next.js (same repo, new `backend/` app) + tRPC + Prisma + PostgreSQL.**

- **tRPC** — the frontend's `lib/api/resources/*.ts` functions already are the
  contract; tRPC procedures mirror them 1:1 (same names, same shapes), so the
  swap from mock-store calls to network calls is mechanical. Internal-only:
  once Integrations/webhooks need a public, third-party-callable API (Phase
  4+), that's a separate versioned REST/OpenAPI surface behind the same
  service layer, not tRPC stretched to do a job it's bad at.
- **Prisma** — `frontend/src/types/domain.ts` is already the schema, refined
  across 5 build phases. `schema.prisma` (below) is a close-to-direct
  translation of it.
- **PostgreSQL**, hosted on **Neon** (built-in connection pooling, branch-per-
  environment) — see the connection-pooling note below for why the pooled
  connection string matters from day one, not after a production incident.
- **Auth.js**, **database-backed sessions** (not JWT) — revocable, which
  matters once impersonation and audit logging are real. Argon2id password
  hashing, never plaintext (see `SECURITY_REVIEW.md` — the mock's
  `MOCK_PASSWORD` string comparison must never be the real pattern).
- **Cloudflare R2** for file storage (videos, SCORM packages, uploaded
  documents) — cheaper than S3, same API shape.
- One small **long-running worker** (Railway or Fly.io, not a Vercel
  serverless function) for SCORM package extraction/validation and video
  processing — these can exceed a serverless function's time/memory budget,
  and untrusted zip extraction shouldn't run inline in the same process
  serving the app. The upload endpoint hands off and returns immediately;
  the frontend's existing "processing..." state (built for exactly this) is
  what the learner sees while it runs.

## Tenant isolation — the foundation, built first

The single highest-risk bug class in multi-tenant SaaS is a query that
forgets its `orgId` filter, leaking one customer's data to another. The plan
is to make that structurally impossible rather than a convention every
resolver has to remember:

1. Every tRPC procedure's context carries the caller's `orgId` (from their
   session — never from a request parameter, which a client could forge).
2. A single middleware wraps the Prisma client so every query for a
   tenant-scoped model is automatically filtered to that `orgId` — a
   resolver cannot accidentally omit it, because it never writes the filter
   itself.
3. **The tenant-isolation integration test suite is written before the
   second resource is migrated**, not after the whole backend is "done." It
   creates two orgs, seeds data in both, and asserts one's session can never
   fetch the other's rows, no matter what it asks for. Every subsequent PR
   runs against it.

This is step one of the build, before login, before anything — the
foundation everything else sits on.

## Migration order (resource-client by resource-client)

Each step: write the Prisma models it needs (if not already migrated),
write the tRPC router, swap that resource-client file's internals from
`useDirectoryStore`/`useLearningStore` calls to `trpc.*.mutate()` calls,
keep exported function signatures identical so nothing above them changes.
The app stays demoable at every step — some screens on mock data, some on
real data, nothing dark.

1. ✅ **Tenant-isolation middleware + database-backed auth sessions.** Built
   first, verified against a real Neon database — see
   `backend/src/trpc/tenantScope.test.ts` (two real orgs, proving one can
   never read/update/delete/spoof-create into the other).
2. **`auth.ts`** ✅ (walking skeleton complete and verified live): argon2id
   hashing, database-backed sessions, Postgres-tracked lockout, `login`/`me`/
   `logout` all smoke-tested over real HTTP against Neon — see
   `backend/src/auth/login.test.ts` and `backend/README.md`'s curl examples.
   **`users.ts`** router exists (list/updateRole/deactivate/reactivate) but
   isn't yet exercised by an integration test the way auth is — do that
   before calling it done. **`organizations.ts`, `roles.ts`** not started.
   The frontend's own `lib/api/resources/*.ts` files still call the mock
   store for everything, including auth — wiring the frontend to actually
   call this backend is the next concrete step, not yet done.
3. **`courses.ts`** (without file upload yet — `assetId` stays
   metadata-only a little longer).
4. **`content.ts`** — real file storage via R2, presigned upload URLs, the
   SCORM extraction worker. This is where the sandboxed-serving contract
   from `SECURITY_REVIEW.md`'s SCORM section becomes load-bearing: uploaded
   content is served from an isolated domain, never the app's own origin.
5. **`assignments.ts`, `quizzes.ts`, `certificates.ts`, `paths.ts`,
   `skills.ts`.** `quizzes.ts` is the one to get right on the first try, not
   iterate into: the real API must serve two distinct shapes (an authoring
   shape with answers, `courses:edit`-gated; an attempt shape with options
   only, correctness computed server-side on submit) — see
   `SECURITY_REVIEW.md`'s "quiz answers ship to the client" finding for why.
6. **`notifications.ts`, `calendar.ts`, `careerPaths.ts`, `academies.ts`,
   `communities.ts`.**
7. **`reports.ts`, `analytics.ts`, `auditLog.ts`** — these become real SQL
   aggregate queries instead of in-memory array filtering, which is where
   Postgres actually starts paying for itself.
8. **`billing.ts`** — last, since real payment collection (Stripe) is
   explicitly separate scope from recording a plan choice, and everything
   else is higher-value first.
9. **`integrations.ts`, `scorm.ts` (LRS/xAPI)** — real OAuth flows, a real
   (optional) LRS connection. Lowest priority; these were UI shells over
   mock state by design.

## What must not carry over from the mock, verbatim

From `SECURITY_REVIEW.md` — the specific things a real implementation must
get right that the mock could not:

- Quiz/assessment correct answers: never in a response before that specific
  attempt is submitted.
- Passwords: argon2id, never a string comparison.
- Permissions: re-checked server-side on every mutation; the client's copy
  (`sessionStore`) is a UI convenience, never the enforcement point.
- SCORM content: served from an isolated domain, sandboxed
  (`sandbox="allow-scripts"`, no `allow-same-origin` for same-origin-adjacent
  serving), never trusted the way first-party code is.

## Accounts and services needed before/during this build

See the credentials checklist below — nothing here needs to be obtained
until the corresponding step in the migration order above is actually
reached.
