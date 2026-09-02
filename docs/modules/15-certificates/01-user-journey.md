# Step 1 — User Journey — Certificates

Personas: **Learner** (earns/shares), **Instructor/Org Admin** (sees who's earned what), and an **anonymous verifier** (checks a shared certificate is real).

## Journey 1 — Earning one

1. Passes an Assessment with a linked certificate (Assessments Journey 2), or completes a Course/Path an instructor configured to award one on completion (a simple toggle, not designed as a separate screen — an addition to Course/Path Settings tabs).
2. Certificate appears immediately in My Certificates (Learning mode nav — a new item, since none existed yet; see note below) — no waiting, no manual issuance step for the common case.

## Journey 2 — Sharing/verifying it

1. From My Certificates, opens one — sees the rendered certificate (fixed template, their name/course/date filled in) and a "Share" action that copies a public verification link.
2. Anyone with that link (no login required) lands on a plain verification page: "This certifies that [Name] completed [Course] on [Date]. Verified by Yughma LMS for [Org]." — exactly the credibility payoff the original architect note called out.

## Journey 3 — Admin oversight

1. Manage mode → Teaching → Certificates (cross-course list, same family as the Assignments list) — every certificate issued org-wide, filterable by course/person.
2. Can manually issue one (for edge cases — someone completed something outside the system, e.g., an external training) or revoke one (mistaken issuance) — both simple actions on a row, not separate flows.

## Edge cases

- **Revoking a certificate someone already shared publicly:** the verification page updates to show a clearly-marked "Revoked" state rather than 404ing — a dead link looks more suspicious than an honest revoked status, and the person who shared it deserves the link to keep working (just showing the truth).
- **Course renamed after a certificate was issued:** the certificate shows the course title *as it was at issuance*, not a live reference — a certificate is a historical record, not a live-updating document.

## What this rules in for Step 2 (User Flow)

- The "award on completion" toggle lives in Course/Path settings, not a new screen here.
- Verification is a public, no-login page — a hard requirement, not an enhancement.
- Revoke needs its own visible state on the verification page, not just removal from My Certificates.

## Nav note

My Certificates already exists as a Shell sidebar item ("Certificates" — see [Shell wireframes](../00-cross-cutting-shell/04-wireframes.md)) — no refinement needed here, unlike Dashboard/Skills.
