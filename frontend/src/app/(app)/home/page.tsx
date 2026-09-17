"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, CheckCircle2, GraduationCap, PlayCircle, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StaggerContainer, StaggerItem } from "@/components/motion/Stagger";
import { EmptyState } from "@/components/patterns/EmptyState";
import { useSessionStore } from "@/state/sessionStore";
import { gradientForSeed } from "@/lib/utils";
import * as dashboardApi from "@/lib/api/resources/dashboard";

const STAT_TONE = "bg-accent-soft text-accent-soft-fg";
const GOLD_TONE = "bg-gold-bg text-gold-bg-fg";

function iconForActivity(text: string) {
  if (text.startsWith("You completed")) return CheckCircle2;
  if (text.startsWith("You earned a certificate")) return Award;
  if (text.startsWith("You were enrolled")) return UserPlus;
  return GraduationCap;
}

export default function HomePage() {
  const session = useSessionStore((s) => s.session);
  const name = session?.user.name.split(" ")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["learnerDashboard", session?.user.id],
    queryFn: () => dashboardApi.getLearnerDashboard(),
    enabled: !!session,
  });

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

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading your dashboard...</p>
      ) : !data ? null : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Continue Learning</h2>
            {data.continueLearning.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nothing in progress"
                description="Courses you're enrolled in will show up here."
              />
            ) : (
              <StaggerContainer className="flex flex-wrap gap-4">
                {data.continueLearning.map((c) => (
                  <StaggerItem key={c.courseId}>
                    <Link href={`/courses/${c.courseId}`}>
                      <Card interactive className="flex w-55 cursor-pointer flex-col gap-3 p-3">
                        <div
                          className="flex h-20 items-center justify-center rounded-md"
                          style={{ backgroundImage: gradientForSeed(c.courseId) }}
                        >
                          <PlayCircle className="size-7 text-white/90" aria-hidden />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-text-secondary">{c.title}</span>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-alt">
                            <div
                              className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                              style={{ width: `${c.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">This Week</h2>
            <StaggerContainer className="flex flex-wrap gap-4">
              <StaggerItem>
                <Card className="flex w-51 items-center gap-3 p-3.5">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${STAT_TONE}`}>
                    <BookOpen className="size-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-text-primary">{data.stats.coursesInProgress}</p>
                    <p className="text-[11px] text-text-tertiary">Courses in progress</p>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="flex w-51 items-center gap-3 p-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
                    <CheckCircle2 className="size-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-text-primary">{data.stats.completedThisMonth}</p>
                    <p className="text-[11px] text-text-tertiary">Completed this month</p>
                  </div>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="flex w-51 items-center gap-3 p-3.5">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${GOLD_TONE}`}>
                    <Award className="size-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-text-primary">{data.stats.certificatesEarned}</p>
                    <p className="text-[11px] text-text-tertiary">Certificates earned</p>
                  </div>
                </Card>
              </StaggerItem>
            </StaggerContainer>
          </section>

          <section className="flex flex-col gap-1">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Recent Activity</h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-text-tertiary">Nothing yet — get started on a course.</p>
            ) : (
              data.recentActivity.map((a, i) => {
                const Icon = iconForActivity(a.text);
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5 text-sm text-text-secondary">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-tertiary">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    {a.text}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}
