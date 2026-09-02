# Step 4 — Wireframes — Analytics

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md). Charts are labeled placeholders — actual chart design happens once real data shape is known (out of scope for a wireframe pass).

## Org Overview tab

```
  Analytics
  [ Org Overview ]  Courses  Learners
  ──────────────────────────────────────────────────────
  Active users        Completions (30d)     Avg. time to complete
  118                  342                    6.2 days

  [ line chart: active users over time ]
  [ line chart: completions over time ]
```

## Courses tab

```
  Analytics
  Org Overview  [ Courses ]  Learners
  ──────────────────────────────────────────────────────
  Course                      Completion    Engagement
  ──────────────────────────────────────────────────────
  Onboarding Compliance 2026   91%           High
  Sales Fundamentals            64%           Medium
  Data Fundamentals             22%           Low
```

## Learners tab

```
  Analytics
  Org Overview  Courses  [ Learners ]
  ──────────────────────────────────────────────────────
  [ bar chart: learners by progress band —
    On track / At risk / Falling behind ]
```

## Low-data state

```
  Analytics
  [ Org Overview ]  Courses  Learners
  ──────────────────────────────────────────────────────
              Not enough data yet
     Trends appear once your org has a
          few weeks of activity.
```
