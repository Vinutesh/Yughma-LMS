# Step 2 — User Flow — Full Billing

## Flow A — View & manage billing

```mermaid
flowchart TD
    A[Settings -> Billing tab] --> B[Current plan, seats used/limit, next invoice date]
    B --> C{Action}
    C -- Update payment method --> D[Replace card-shaped record]
    C -- Request more seats --> E[Records a pending seat-increase intent]
    C -- Cancel --> F[Confirm -> schedules lapse at period end]
    B --> G[Invoice history list, newest first]
```

## Flow B — Past due

```mermaid
flowchart TD
    A[Mock payment marked failed] --> B[Subscription status -> Past due]
    B --> C[Banner shown org-wide to Org Admin, same family as trial-ending banner]
    C --> D[Org Admin updates payment method]
    D --> E[Status returns to Active]
```

## Carried into Step 3 (Sitemap)

Billing tab (current plan/seats/payment method/invoices), update-payment-method dialog, request-seats dialog, cancel-confirm dialog, past-due banner.
