# Open Questions — Lessons

No blocking questions — narrowing applied:

- **4 lesson types in v1:** Video, Text, PDF, External Link. **Live session** (from [MODULES.md](../../MODULES.md) §8) is deferred — it depends on Calendar/Zoom-style integrations that aren't designed yet (Phase 3+). **SCORM** is its own module, Phase 4 — a SCORM lesson type gets added here once that module exists, not designed twice.
- **Video/PDF lesson types reuse Content Library's picker mode** directly (established in [Content Library Flow B](../06-content-library/02-user-flow.md)) — this module doesn't design a second upload flow.
- **Completion model:** Video/PDF/External Link auto-complete on open (simplest possible v1 rule — "they opened it" counts as done); Text lessons need an explicit "Mark complete" since there's no natural "finished playing/viewing" signal for a block of text. Good enough for v1; a more rigorous completion model (e.g., % scrolled, video watch-time) is a reasonable future refinement, not this pass's job.
