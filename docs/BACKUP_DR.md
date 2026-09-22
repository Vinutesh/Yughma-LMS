# Backup & disaster recovery

**Status today: nothing in this repo configures or documents a backup
policy.** Coverage relies entirely on whatever Neon plan/tier this project's
database is actually on — that has not been verified against the live Neon
dashboard as part of writing this doc. This file exists so that gap is
explicit and trackable, not so it can be checked off as solved.

## What Neon actually provides

Neon's backup/recovery mechanism is **point-in-time recovery (PITR)** via an
"instant restore" history window, not periodic snapshot backups in the
traditional sense — the database can be restored to any point within that
window, down to close to the second. The window length is plan-dependent:

- **Free plan: up to 6 hours** of history.
- **Paid plans (Launch/Scale and above): configurable up to 30 days**, billed
  separately from live storage (~$0.20/GB-month of data changes) via
  Settings → Instant Restore in the Neon console.

*(Figures per Neon's own docs/blog as of this writing — verify against the
current Neon pricing page before relying on them, plan names and pricing
structures change.)*

## What to check before this can be marked done

1. **Which plan is this project's Neon database actually on** — free or
   paid? This determines whether the real recovery window is ~6 hours or up
   to 30 days. Check the Neon console directly; nothing in this repo's env
   vars or docs records it.
2. **What RPO/RTO does this specific client actually need?** A 6-hour PITR
   window means up to 6 hours of data loss in the worst case, and restoring
   isn't instant even if "instant restore" is the feature name — there's no
   measured restore-time figure for this project yet. If the client has a
   contractual or compliance RPO/RTO requirement, get the actual number
   before assuming the current setup meets it.
3. **If the plan is free tier**, upgrading to a paid tier with a longer PITR
   window is the single highest-leverage fix available here — it's a Neon
   console setting change, not an engineering project.
4. **R2 (video/file storage) has no separate backup story documented either.**
   Cloudflare R2 has 11 nines of durability by design (replicated storage),
   but that protects against infrastructure failure, not against an
   application bug or a bad actor deleting objects — there's no versioning
   or soft-delete configured on the bucket today. Worth a deliberate decision
   (enable R2 object versioning, or accept the risk) rather than leaving it
   unexamined.
5. **No restore has ever been tested or rehearsed** against this project's
   actual database. A backup policy nobody has practiced restoring from is a
   theory, not a plan — this should happen at least once before telling a
   client this box is checked.

## What this doc deliberately does not claim

It does not assert a specific RPO/RTO number, because none has been verified
against the live environment. It does not claim R2 data-loss protection
beyond Cloudflare's own infrastructure durability guarantee. Treat every
number above as "what the vendor offers," not "what this project has
confirmed and tested."
