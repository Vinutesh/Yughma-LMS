"use client";

import { Award, BookOpen, CheckCircle2, Flame, GraduationCap, PlayCircle, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StaggerContainer, StaggerItem } from "@/components/motion/Stagger";
import { useSessionStore } from "@/state/sessionStore";
import { gradientForSeed } from "@/lib/utils";

const CONTINUE_LEARNING = [
  { title: "Sales Fundamentals" },
  { title: "Onboarding Compliance 2026" },
  { title: "Data Fundamentals" },
];

const STATS = [
  { label: "Courses in progress", value: "2", icon: BookOpen, tone: "accent" as const },
  { label: "Completed this month", value: "1", icon: CheckCircle2, tone: "success" as const },
  { label: "Certificates earned", value: "3", icon: Award, tone: "gold" as const },
  { label: "Streak", value: "5 days", icon: Flame, tone: "warning" as const },
];

const TONE_CLASSES = {
  accent: "bg-accent-soft text-accent-soft-fg",
  success: "bg-success-bg text-success",
  gold: "bg-gold-bg text-gold-bg-fg",
  warning: "bg-warning-bg text-warning",
};

const ACTIVITY = [
  { text: "You completed “The discovery call”", icon: CheckCircle2 },
  { text: "Priya graded your submission: “Week 3 Assignment”", icon: GraduationCap },
  { text: "You enrolled in “Data Fundamentals”", icon: UserPlus },
];

export default function HomePage() {
  const name = useSessionStore((s) => s.session?.user.name.split(" ")[0]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <div className="relative overflow-hidden rounded-xl bg-brand-gradient p-6 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />
        <h1 className="relative font-display text-2xl font-bold">
          Welcome back{name ? `, ${name}` : ""}
        </h1>
        <p className="relative mt-1 text-sm text-white/75">
          Pick up where you left off, or see what&apos;s new this week.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Continue Learning</h2>
        <StaggerContainer className="flex flex-wrap gap-4">
          {CONTINUE_LEARNING.map((c) => (
            <StaggerItem key={c.title}>
              <Card interactive className="flex w-55 cursor-pointer flex-col gap-3 p-3">
                <div
                  className="flex h-20 items-center justify-center rounded-md"
                  style={{ backgroundImage: gradientForSeed(c.title) }}
                >
                  <PlayCircle className="size-7 text-white/90" aria-hidden />
                </div>
                <span className="text-xs font-medium text-text-secondary">{c.title}</span>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">This Week</h2>
        <StaggerContainer className="flex flex-wrap gap-4">
          {STATS.map((s) => (
            <StaggerItem key={s.label}>
              <Card className="flex w-51 items-center gap-3 p-3.5">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[s.tone]}`}>
                  <s.icon className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-primary">{s.value}</p>
                  <p className="text-[11px] text-text-tertiary">{s.label}</p>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Recent Activity</h2>
        {ACTIVITY.map((a) => (
          <div key={a.text} className="flex items-center gap-3 py-1.5 text-sm text-text-secondary">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-tertiary">
              <a.icon className="size-3.5" aria-hidden />
            </span>
            {a.text}
          </div>
        ))}
      </section>
    </div>
  );
}
