# Backend Credentials Checklist

What you need to obtain, and when — nothing here blocks starting the backend
work itself; get each one when the corresponding step in
[BACKEND_PLAN.md](BACKEND_PLAN.md)'s migration order is actually reached.

## Needed now (to run the current scaffold)

- [ ] **Neon Postgres** account — [neon.tech](https://neon.tech), free tier is
      plenty to start. Create a project, then copy the **pooled** connection
      string (not the direct one — Neon labels this clearly on the connection
      details page) into `backend/.env` as `DATABASE_URL`.
- [ ] **Auth secret** — run `npx auth secret` inside `backend/` once
      dependencies are installed; it generates and can write this for you.
      Put the value in `.env` as `AUTH_SECRET`.

Once both are set: `npm run prisma:migrate` creates the real tables, then
`npm test` runs the tenant-isolation suite against them. That's the "is this
actually working" checkpoint before writing more routers.

## Needed for the Content Library / SCORM step

- [x] **Cloudflare R2** account — [dash.cloudflare.com](https://dash.cloudflare.com),
      create a bucket, then an API token scoped to R2 (Account → R2 → Manage
      API Tokens). You need: Account ID, Access Key ID, Secret Access Key,
      bucket name. → `backend/.env`'s `R2_*` vars. **Done** — real upload/
      playback is wired end to end (`backend/src/routers/content.ts`).
- [ ] **Deploy the CDN Worker** (`LMS/storage-worker/`) so playback goes
      `browser → Cloudflare edge → R2` instead of through this app server —
      see that project's `README.md` for the exact one-time steps
      (`wrangler login`, set a signing secret, `npm run deploy`). Until this
      is deployed, playback still works via a direct R2 presigned URL (a
      graceful fallback, not a blocker) — deploying the Worker just moves
      delivery fully onto Cloudflare's network, which is the actual cost/
      scale win. Needs: the Worker's deployed URL and a signing secret →
      `backend/.env`'s `CONTENT_WORKER_URL` / `CONTENT_SIGNING_SECRET`.
- [ ] Optional: a **custom domain** for the Worker (e.g.
      `content.yourapp.com`) instead of its default `*.workers.dev` URL —
      nicer branding, not a functional requirement (`*.workers.dev` already
      runs on Cloudflare's edge). Needs a domain on your Cloudflare account;
      see the Worker's README for how to attach it.

## Needed for real login/invite emails

- [ ] **Resend** (or SendGrid) account — for password reset emails and
      invite emails. Free tier covers development. You'll need an API key and
      a verified sending domain (or use their shared test domain while
      developing).

## Needed before Phase 4's Full Billing becomes real (not yet — recorded intent only)

- [ ] **Stripe** account — only when you're ready to actually charge cards.
      Not needed for anything currently planned; the mock Billing tab
      deliberately never asks for this.

## Nice to have, not blocking

- [ ] **Sentry** account (error tracking) — free tier, add whenever convenient.
- [ ] **Vercel** account, if that's the deploy target — needed once there's
      something worth deploying, not before.

## Deliberately not on this list

- Anything SSO/SCIM-related (Integrations module) — those are OAuth
  connections configured per-integration, not a credential you obtain once;
  cross that bridge when a real customer needs a specific one.
- A local Postgres install — Neon's branching makes a cloud dev database less
  friction than running one locally, per BACKEND_PLAN.md's recommendation.
