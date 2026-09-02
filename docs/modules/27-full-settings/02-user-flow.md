# Step 2 — User Flow — Full Settings

## Flow A — Branding

```mermaid
flowchart TD
    A[Settings -> Branding] --> B[Upload logo via Content Library]
    B --> C[Pick accent color]
    C --> D[Preview swatch updates]
    D --> E[Save]
```

## Flow B — Security

```mermaid
flowchart TD
    A[Settings -> Security] --> B[Set session timeout]
    A --> C[Toggle Require SSO]
    C --> D[Inert until an SSO integration is connected]
```

## Flow C — Data export & deletion

```mermaid
flowchart TD
    A[Settings -> Data] --> B[Request export]
    B --> C[Mock: preparing... confirmation]
    A --> D[Delete organization]
    D --> E[Shows real inventory: N users, N courses, N certificates]
    E --> F[Type org name to confirm]
    F --> G[Deleted]
```

## Carried into Step 3 (Sitemap)

Branding tab, Security tab, Data tab (export + delete-org confirm).
