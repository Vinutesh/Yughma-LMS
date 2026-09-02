# Step 2 — User Flow — Integrations

## Flow A — Connect an integration

```mermaid
flowchart TD
    A[Integrations directory] --> B[Click Connect on a card]
    B --> C[OAuth-shaped confirm dialog]
    C --> D[Mock-connected -> card shows Connected]
    D --> E[Open config panel -> generic key-value settings]
```

## Flow B — Webhooks

```mermaid
flowchart TD
    A[Webhooks screen] --> B[+ Add webhook: URL, name, event types]
    B --> C[Signing secret shown once]
    C --> D[Delivery log (mock) + disable/delete]
```

## Flow C — API keys

```mermaid
flowchart TD
    A[API Keys screen] --> B[+ Generate key, name it]
    B --> C[Full key shown once]
    C --> D[List shows masked value + last used]
    D --> E[Revoke]
```

## Carried into Step 3 (Sitemap)

Integrations directory, per-integration config panel, Webhooks screen, API Keys screen.
