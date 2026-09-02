# Step 2 — User Flow — Certificates

## Flow A — Earn and view

```mermaid
flowchart TD
    A[Pass assessment / complete course-with-certificate] --> B[Certificate auto-issued]
    B --> C[Appears in My Certificates]
    C --> D[Open → rendered certificate + Share action]
    D --> E[Copies public verification link]
```

## Flow B — Public verification

```mermaid
flowchart TD
    A[Anyone opens the verification link] --> B{Certificate status}
    B -- Valid --> C['This certifies that... Verified.']
    B -- Revoked --> D['This certificate has been revoked.']
```

## Flow C — Admin oversight

```mermaid
flowchart TD
    A[Certificates — Manage mode, cross-course] --> B{Action}
    B -- Manual issue --> C[Pick person + course/assessment → issued]
    B -- Revoke --> D[Confirm → status flips, verification page updates]
```

## Carried into Step 3 (Sitemap)

My Certificates (learner), certificate detail/view, public verification page (valid + revoked states), Certificates list (admin, cross-course), manual-issue flow, revoke confirm.
