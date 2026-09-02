# Step 2 — User Flow — Trial & Plan

## Flow A — Trial countdown and banner

```mermaid
flowchart TD
    A[Any day of the trial] --> B{Days remaining <= 7?}
    B -- No --> C[No banner — small status only in Settings]
    B -- Yes --> D[Dismissible banner: 'X days left — Choose a plan']
    D -- Dismiss --> E[Hidden this session, reappears next login]
    D -- Click --> F[Plan-comparison screen]
```

## Flow B — Choosing a plan

```mermaid
flowchart TD
    A[Plan-comparison screen] --> B{Role}
    B -- Org Admin --> C[Pick a tier, or Contact sales for Enterprise]
    B -- Anyone else --> D[Screen not reachable at all]
    C --> E[Confirmed — no payment form this pass]
    E --> F["Takes effect when trial ends (or immediately if already ended)"]
```

## Flow C — Trial expires with no plan chosen

```mermaid
flowchart TD
    A[Trial end date reached, no plan chosen] --> B{Role on next login}
    B -- Org Admin --> C[Blocking screen: plan-comparison embedded directly]
    B -- Anyone else --> D[Non-blocking message: 'Waiting on your Org Admin to choose a plan']
    C --> E[Picks a plan → unblocked]
```

## Carried into Step 3 (Sitemap)

Trial status indicator (Settings), trial-ending banner, plan-comparison screen (used in 3 contexts), trial-expired blocking screen (Org Admin), trial-expired message (everyone else).
