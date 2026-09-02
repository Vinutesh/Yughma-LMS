# Yughma LMS — Backend

See `../docs/BACKEND_PLAN.md` for the full plan and migration order. Status:
**tenant isolation and real login are both live and verified against a real
Neon Postgres database** — not just typechecked. What exists:

- `prisma/schema.prisma` — the full data model, translated from
  `../frontend/src/types/domain.ts`, migrated and running against Neon.
- `src/trpc/tenantScope.ts` — the tenant-isolation Prisma Client Extension.
  Every tenant-scoped query is automatically filtered to the calling org;
  `tenantScope.test.ts` proves it against a live database (two real orgs,
  asserting one can never read/update/delete/spoof-create into the other).
- `src/auth/` — real login: argon2id password hashing, database-backed
  sessions (revocable, not JWT), lockout after 3 failed attempts tracked in
  Postgres (so it's already correct across multiple server instances, unlike
  the frontend mock's in-memory version). `login.test.ts` exercises all of
  it — right password, wrong password, lockout, deactivated user, expired
  session, logout — against the real database.
- `src/routers/auth.ts` — `login`, `me`, `logout`, smoke-tested over live
  HTTP (see below).
- `src/routers/users.ts` — the first resource router, migrated from the
  frontend's `lib/api/resources/users.ts` as the pattern to repeat for the
  rest of BACKEND_PLAN.md's migration order.
- `src/index.ts` — a standalone dev server, token via `Authorization: Bearer`.
  The real deployment target is very likely a Next.js Route Handler instead
  (see the file's own comment) — swapping the adapter doesn't touch anything
  under `routers/` or `trpc/`.

## Getting this running

1. `npm install`
2. Copy `.env.example` to `.env`, fill in `DATABASE_URL` (Neon's **pooled**
   connection string) and `AUTH_SECRET` (`npx auth secret` — verify it writes
   `AUTH_SECRET`, not `BETTER_AUTH_SECRET`; a naming collision with a
   different package has done that once already).
3. `npm run prisma:migrate` — creates the real tables.
4. `npm test` — tenant isolation + login, both against the real database.
   Must stay green before more routers get added.
5. `npm run dev` — starts the server on `:4000`.

Live smoke test, if you want to see it for yourself:

```bash
curl -X POST http://localhost:4000/auth.login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'
# -> { result: { data: { token, session: { user, org, roles, permissions } } } }

curl http://localhost:4000/auth.me -H "Authorization: Bearer <token>"
```

## What's NOT here yet

- Any router beyond `users` and `auth`
- File storage (R2), the SCORM extraction worker, email sending
- Wiring the frontend's actual `lib/api/resources/*.ts` files to call this
  instead of the mock store — that's the next step, resource-client by
  resource-client, per BACKEND_PLAN.md
