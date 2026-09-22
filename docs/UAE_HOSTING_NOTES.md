# UAE hosting & data residency — research notes

A short findings memo, not a commitment. This is exactly the kind of
research the readiness audit flagged as needed before any commercial
promise about UAE data residency — the short version is that **the current
vendor stack (Neon + Cloudflare R2) cannot satisfy a hard "data must stay
physically in the UAE" requirement today**, though partial mitigations
exist for parts of the stack. Get the client's actual requirement in
writing before assuming either outcome.

## Neon (Postgres database) — no Middle East region

Neon's supported regions (per their own docs, checked while writing this):

- AWS: US East (N. Virginia, Ohio), US West (Oregon), Europe (Frankfurt,
  London), Asia Pacific (Singapore, Sydney), South America (São Paulo).
- Azure regions exist but are **deprecated** — no new projects can be
  created there.

**No Bahrain (`me-south-1`) or UAE (`me-central-1`) region is offered**,
despite AWS itself running both. This means the database itself — the most
sensitive tier of data in the platform — cannot be pinned inside the UAE (or
the wider Gulf) on Neon as it exists today. The nearest available region is
Europe (Frankfurt), which keeps data in the EU but not in the Gulf.

**If UAE residency for the database specifically is a hard requirement**,
that's a vendor change, not a config change — options would include a
different managed Postgres provider with an actual Middle East presence, or
self-hosting Postgres on AWS `me-central-1` directly (losing Neon's
serverless/branching conveniences in the process). This is a real
architectural fork, not a setting to flip.

## Vercel (app hosting) — Dubai region exists

Vercel added a Dubai edge region (`dxb1`) to its network, usable for edge
caching and as an execution region for Vercel Functions. This is a genuine
partial win: the **application layer** (page rendering, API routes) can run
physically in the UAE. It does not change where the **database** or
**file storage** actually live, though — an app server in Dubai still
talking to a database in Frankfurt is not "UAE data residency" for the data
itself, only for compute proximity/latency.

## Cloudflare R2 (video/file storage) — no UAE/Gulf jurisdiction

R2 offers **jurisdictional restrictions** for exactly two jurisdictions
today: **EU** and **FedRAMP** (US government). Setting EU jurisdiction pins
a bucket to EU data centers with no transparent replication elsewhere.
**There is no Middle East/UAE jurisdiction option.** Cloudflare's edge CDN
(already in use for content delivery — see `storage-worker/`) does route
through UAE-region edge nodes for *caching* already, by the nature of
Cloudflare's network, but the **origin storage** of the actual files is not
residency-pinnable to the UAE.

## Bottom line for the client conversation

| Layer | UAE-pinnable today? |
|---|---|
| Application/compute (Vercel) | Yes — Dubai region exists |
| Database (Neon) | **No** — nearest is Frankfurt |
| File storage (R2) | **No** — EU/FedRAMP jurisdictions only |

Ask the client directly: is "UAE hosting" about **latency/compute presence**
(already achievable) or a **hard legal data-residency requirement** for the
database and stored files specifically (not achievable on the current stack
without a vendor change)? The two are very different asks with very
different costs, and the audit's original 24% readiness score assumed the
worse case wasn't yet ruled out. This memo rules it out for Neon/R2 as they
stand — the honest options if the hard requirement is real are: (a) migrate
the database and file storage to UAE/Bahrain-region infrastructure on a
different provider, or (b) get written confirmation from the client that
compute-region proximity (Vercel's Dubai region) satisfies their actual
requirement, which it may well do if "hosted in the region" was the ask
rather than a formal residency/compliance mandate.
