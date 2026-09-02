# Step 4 — Wireframes — Certificates

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

---

## My Certificates (learner)

```
  My Certificates
  ──────────────────────────────────────────────────────
  ┌──────────────┐ ┌──────────────┐
  │ [cert thumb]   │ │ [cert thumb]   │
  │ Sales           │ │ Onboarding      │
  │ Fundamentals    │ │ Compliance 2026 │
  │ Earned Aug 3     │ │ Earned Jul 20    │
  └──────────────┘ └──────────────┘
```

## Certificate detail/view

```
  ← My Certificates
  ┌────────────────────────────────────────────────┐
  │                                                  │
  │                  Acme Corp                      │
  │           Certificate of Completion              │
  │                                                  │
  │              This certifies that                 │
  │                Jamie Lee                         │
  │         has completed Sales Fundamentals          │
  │                on August 3, 2026                  │
  │                                                  │
  │        Verification code: YU-8F2K-QX91            │
  └────────────────────────────────────────────────┘
                    [ Share link ]  [ Download ]
```

## Public verification page (no login)

```
  ──────────────────────────────────────────────────────
                       Yughma LMS
  ──────────────────────────────────────────────────────
              ✓ This certificate is valid

           Jamie Lee completed Sales Fundamentals
                  on August 3, 2026
             Issued by Acme Corp via Yughma LMS
             Verification code: YU-8F2K-QX91
```

**Revoked state:**
```
  ──────────────────────────────────────────────────────
                       Yughma LMS
  ──────────────────────────────────────────────────────
             ⚠ This certificate has been revoked
              Verification code: YU-8F2K-QX91
```

## Certificates admin list (Manage mode, cross-course)

```
  Certificates                              [ Issue manually ]
  ──────────────────────────────────────────────────────
  Recipient      Course                   Issued     ⋯
  ──────────────────────────────────────────────────────
  Jamie Lee       Sales Fundamentals       Aug 3       ⋯
  Raj Patel       Onboarding Compliance    Jul 20      ⋯
```

`⋯` → Revoke.

## Manual issue (modal)

```
┌──────────────────────────────────────────┐
│  Issue certificate                     ✕  │
│  ────────────────────────────────────────│
│  Recipient          Course/Assessment      │
│  ┌────────────┐     ┌────────────────┐   │
│  │ Select... ▾ │     │ Select...    ▾ │   │
│  └────────────┘     └────────────────┘   │
│              [Cancel]  [ Issue ]           │
└──────────────────────────────────────────┘
```

## Revoke confirm

```
┌──────────────────────────────────────────┐
│  Revoke Jamie Lee's certificate?          │
│  ────────────────────────────────────────│
│  The public verification link will show    │
│  it as revoked, not disappear.             │
│              [Cancel]  [ Revoke ]           │
└──────────────────────────────────────────┘
```
