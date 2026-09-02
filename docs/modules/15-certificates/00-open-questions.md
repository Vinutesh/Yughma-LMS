# Open Questions — Certificates

No blocking questions — narrowing applied:

- **No visual template designer in v1.** [MODULES.md](../../MODULES.md) §14 calls for one; a drag-drop certificate designer is a real, separate piece of design/engineering work disproportionate to a first pass. v1 ships **one fixed Yughma-designed template** with the variable fields (org name, recipient name, course/assessment title, date, a verification code) auto-filled — an instructor names the certificate and picks nothing else. Revisit once there's demand for custom-branded certificate layouts.
- **Public verification page is in scope** — high value (external credibility, per the original architect note), low design cost (one simple page).
- **My Certificates (learner wallet)**, an issued-certificates list (admin, cross-course — same pattern as the Assignments cross-course list), and the certificate detail/view itself round out the module.
