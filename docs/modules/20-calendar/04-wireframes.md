# Step 4 — Wireframes — Calendar

Markdown/ASCII per [CLAUDE.md](../../CLAUDE.md).

## Calendar (month view)

```
  Calendar                    [ Month ] Week  Agenda      [ + Add event ]
  ──────────────────────────────────────────────────────
   Mon   Tue   Wed   Thu   Fri
                      12          13
                      ● Week 3     ● Live Q&A
                      Reflection   call
                      due
```

## Event detail — deadline (read-only)

```
┌──────────────────────────────────────────┐
│  Week 3 Reflection due                     │
│  ────────────────────────────────────────│
│  Sales Fundamentals · Aug 12                │
│                                            │
│                    [ Go to assignment → ]  │
└──────────────────────────────────────────┘
```

## Event detail — manual event (editable, instructor view)

```
┌──────────────────────────────────────────┐
│  Live Q&A call                          ✕  │
│  ────────────────────────────────────────│
│  Aug 13, 2:00pm                            │
│  Open Q&A on objection handling.            │
│  Link: meet.google.com/xyz                 │
│                                            │
│              [ Edit ]      [ Delete ]      │
└──────────────────────────────────────────┘
```

## Add event form

```
┌──────────────────────────────────────────┐
│  Add event                             ✕  │
│  ────────────────────────────────────────│
│  Title                                     │
│  ┌──────────────────────────────────┐    │
│  └──────────────────────────────────┘    │
│  Date/time            Link (optional)      │
│  ┌────────────┐       ┌────────────────┐ │
│  └────────────┘       └────────────────┘ │
│  Description                               │
│  ┌──────────────────────────────────┐    │
│  └──────────────────────────────────┘    │
│              [Cancel]  [ Add event ]       │
└──────────────────────────────────────────┘
```
