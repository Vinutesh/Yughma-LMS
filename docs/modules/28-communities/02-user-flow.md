# Step 2 — User Flow — Communities

## Flow A — Post and reply

```mermaid
flowchart TD
    A[Discussion tab: course or org-wide feed] --> B[+ New thread, or open existing]
    B --> C[Thread detail: posts in order]
    C --> D[Reply]
    D --> E[Notify thread participants]
```

## Flow B — Moderate

```mermaid
flowchart TD
    A[courses:edit holder, in a thread] --> B{Action}
    B -- Pin --> C[Thread stays at top of its list]
    B -- Lock --> D[No new replies, still readable]
    B -- Remove --> E[Post/thread removed]
```

## Flow C — Report

```mermaid
flowchart TD
    A[Anyone: report a post] --> B[Pick a reason]
    B --> C[Lands in Moderation Queue]
    C --> D{Reviewer decides}
    D -- Remove --> E[Post removed, reporter's queue item resolved]
    D -- Dismiss --> F[Report closed, post stays]
```

## Carried into Step 3 (Sitemap)

Course Discussion tab, org-wide Community feed, Thread detail, Moderation Queue, Report dialog.
