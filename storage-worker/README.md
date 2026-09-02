# Content CDN Worker

A small Cloudflare Worker that sits in front of the private R2 content
bucket, bound directly to it (`[[r2_buckets]]` in `wrangler.toml`) so
Worker→R2 traffic never leaves Cloudflare's network — no egress cost, no
round trip through the public internet. This is what makes
`browser → Cloudflare CDN → R2` real instead of `browser → Vercel → R2`.

The bucket stays private. Every request must carry a short-lived HMAC
signature (`expires` + `token` query params) that the backend mints in
`backend/src/storage/cdn.ts` and this Worker verifies before streaming a
single byte. It also supports HTTP `Range` requests, which is what lets a
learner scrub/seek in a video instead of re-downloading it from the start.

## One-time setup

1. **Install Wrangler and log in** (from this directory):
   ```
   npm install
   npx wrangler login
   ```
   This opens a browser to authorize Wrangler against your Cloudflare
   account — no API token needed for this step.

2. **Create the R2 bucket** (if you haven't already, via the dashboard or):
   ```
   npx wrangler r2 bucket create yughma-content
   ```
   The name must match `R2_BUCKET_NAME` in `backend/.env` exactly, and the
   `bucket_name` in `wrangler.toml` here.

3. **Set the signing secret** — generate a long random value and set it
   as a Wrangler secret (never committed, never in `wrangler.toml`):
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   npm run secret:set
   ```
   Paste the generated value when prompted. Then put the **same** value in
   `backend/.env` as `CONTENT_SIGNING_SECRET` — both sides sign/verify with
   this one shared secret.

4. **Deploy:**
   ```
   npm run deploy
   ```
   Wrangler prints the Worker's URL, something like
   `https://yughma-content.<your-subdomain>.workers.dev` — that's already a
   real, working CDN endpoint on Cloudflare's edge. Put it in `backend/.env`
   as `CONTENT_WORKER_URL`.

That's it — the backend automatically starts routing every playback URL
through this Worker instead of a direct R2 presigned URL (see
`resolvePlaybackUrl` in `backend/src/routers/content.ts`), no other code
change needed.

## Optional: a custom domain instead of `*.workers.dev`

Nicer URL, not a functional requirement — `*.workers.dev` already runs on
Cloudflare's edge network, so skip this if you don't need a branded
hostname yet.

1. Add a domain to your Cloudflare account (or use one already there).
2. Cloudflare dashboard → Workers & Pages → `yughma-content` → Settings →
   Domains & Routes → add a custom domain, e.g. `content.yourapp.com`.
3. Uncomment the `routes` block in `wrangler.toml`, set `pattern` to that
   hostname, then `npm run deploy` again.
4. Update `CONTENT_WORKER_URL` in `backend/.env` to the new domain.

## Local development

```
npm run dev
```
Runs the Worker locally against a local R2 simulator (Miniflare) — good for
testing the Worker's own logic (signature checks, range handling) in
isolation, but the backend's `CONTENT_WORKER_URL` would need to point at
this local URL to actually exercise the full flow end to end.
