"use client";

import { Card } from "@/components/ui/Card";
import { useSessionStore } from "@/state/sessionStore";

const CONTINUE_LEARNING = [
  { title: "Sales Fundamentals" },
  { title: "Onboarding Compliance 2026" },
  { title: "Data Fundamentals" },
];

const STATS = [
  { label: "Courses in progress", value: "2" },
  { label: "Completed this month", value: "1" },
  { label: "Certificates earned", value: "3" },
  { label: "Streak", value: "5 days" },
];

const ACTIVITY = [
  "You completed “The discovery call”",
  "Priya graded your submission: “Week 3 Assignment”",
  "You enrolled in “Data Fundamentals”",
];

export default function HomePage() {
  const name = useSessionStore((s) => s.session?.user.name.split(" ")[0]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Home</h1>
        <p className="text-sm text-text-tertiary">Welcome back{name ? `, ${name}` : ""}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-text-tertiary">Continue Learning</h2>
        <div className="flex flex-wrap gap-4">
          {CONTINUE_LEARNING.map((c) => (
            <Card key={c.title} className="flex w-55 flex-col gap-2 p-3">
              <div className="size-10 rounded-md bg-surface-alt" aria-hidden />
              <span className="text-xs text-text-secondary">{c.title}</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-text-tertiary">This Week</h2>
        <div className="flex flex-wrap gap-4">
          {STATS.map((s) => (
            <Card key={s.label} className="w-51 p-3.5">
              <p className="text-base font-semibold text-text-primary">{s.value}</p>
              <p className="text-[11px] text-text-tertiary">{s.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="mb-2 text-xs font-semibold text-text-tertiary">Recent Activity</h2>
        {ACTIVITY.map((a) => (
          <div key={a} className="flex items-center gap-2.5 py-1.5 text-sm text-text-secondary">
            <span className="size-2 rounded-full bg-text-tertiary/50" aria-hidden />
            {a}
          </div>
        ))}
      </section>
    </div>
  );
}
