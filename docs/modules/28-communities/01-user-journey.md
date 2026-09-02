# Step 1 — User Journey — Communities

Personas: **Learner** (post, reply, report), **Instructor/Manager** (moderate), **Org Admin** (same moderation rights as any `courses:edit` holder).

## Journey 1 — Course discussion

1. From a course, a learner opens its Discussion tab, sees existing threads, and starts a new one or replies to an existing one.
2. The instructor sees the same thread list and can reply, pin an important thread to the top, or lock one that's run its course.

## Journey 2 — Org-wide feed

1. From a new "Community" nav item, any learner sees the org-wide feed — threads not scoped to a specific course.
2. Same posting/replying interaction as course discussion.

## Journey 3 — Reporting and moderation

1. A learner reports a post they find inappropriate — a lightweight reason picker, no free-text novel required.
2. An instructor/manager sees a Moderation Queue listing reported content, can view it in context, and remove it (or dismiss the report if it's fine).

## Journey 4 — Notifications

1. Someone replies to your thread — you get a notification through the existing bell/Notification Center, same as any other category.

## What this rules in for Step 2 (User Flow)

- One thread/post model, two scopes (course, org-wide) — not two separate systems.
- Pin/lock/remove as thread-level actions available to `courses:edit` holders; report as the only action available to everyone else.
