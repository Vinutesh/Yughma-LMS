# Step 4 — Wireframes — Full Billing

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## Settings → Billing tab

```
  Settings   General  Departments & Teams  Plan  [ Billing ]
  ──────────────────────────────────────────────────────
  Growth plan                              Active
  Seats: 4 of 500 used
  Next invoice: Sep 8, 2026 — $499.00

  Payment method
  Visa •••• 4242                          [ Update ]

                                    [ Request more seats ]
                                    [ Cancel subscription ]
  ──────────────────────────────────────────────────────
  Invoice history
  Aug 8, 2026    $499.00    Paid
  Jul 8, 2026    $499.00    Paid
  Jun 8, 2026    $499.00    Paid
```

## Past-due banner (shell, same family as trial-ending)

```
┌──────────────────────────────────────────────────────────┐
│  ⚠ Payment failed — update your payment method     ✕      │
├──────────────────────────────────────────────────────────┤
│  [ ...rest of shell renders normally underneath... ]      │
└──────────────────────────────────────────────────────────┘
```

## Update payment method (dialog)

```
┌──────────────────────────────────────────┐
│  Update payment method                 ✕  │
│  ────────────────────────────────────────│
│  Card brand        Last 4 digits           │
│  ┌────────────┐    ┌────────────┐         │
│  │ Visa      ▾ │    │ 4242        │         │
│  └────────────┘    └────────────┘         │
│  (Mock only — a real integration collects   │
│   this via Stripe Elements, never a raw     │
│   card number touching our servers.)        │
│              [Cancel]  [ Save ]             │
└──────────────────────────────────────────┘
```

## Request more seats (dialog)

```
┌──────────────────────────────────────────┐
│  Request more seats                    ✕  │
│  ────────────────────────────────────────│
│  Currently: 4 of 500 seats used            │
│  Additional seats needed                    │
│  ┌────────────┐                            │
│  │ 50          │                            │
│  └────────────┘                            │
│  We'll follow up to confirm pricing.        │
│              [Cancel]  [ Send request ]     │
└──────────────────────────────────────────┘
```

## Cancel subscription (confirm)

```
┌──────────────────────────────────────────┐
│  Cancel your subscription?                │
│  ────────────────────────────────────────│
│  Your plan stays active through the end     │
│  of this billing period (Sep 8, 2026),      │
│  then your workspace reverts to no plan.    │
│              [Keep plan]  [ Cancel plan ]   │
└──────────────────────────────────────────┘
```
