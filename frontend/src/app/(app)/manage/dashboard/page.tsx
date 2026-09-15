"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePermission } from "@/hooks/usePermission";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { useSessionStore } from "@/state/sessionStore";
import * as dashboardApi from "@/lib/api/resources/dashboard";

/** Manage-mode landing — a real dashboard summary rather than jumping
 * straight into a list screen. Refinement to the Shell's original
 * "first permitted section" default; see
 * LMS/docs/modules/11-dashboard/00-open-questions.md. */
export default function ManageDashboardPage() {
  const canSeeUsers = usePermission("users", "view");
  const canSeeCourses = usePermission("courses", "edit");
  const canSeeTeam = usePermission("team", "view");

  if (!canSeeUsers && !canSeeCourses && !canSeeTeam) {
    return <AccessDenied title="Dashboard" />;
  }

  /**
   * One dashboard per person, picked by their strongest permission — not a
   * stack of every section they happen to qualify for. The module's premise is
   * that legacy platforms ship one cluttered dashboard for everyone; a
   * multi-role account seeing Org Admin stats *and* a grading queue *and* a
   * "no team members" empty state would recreate exactly that. Anything not
   * surfaced here is still one click away in the nav.
   */
  const variant = canSeeUsers ? "orgAdmin" : canSeeCourses ? "instructor" : "manager";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>

      {variant === "orgAdmin" && (
        <>
          <OrgAdminSection />
          <OnboardingChecklist />
        </>
      )}
      {variant === "instructor" && <InstructorSection />}
      {variant === "manager" && <ManagerSection />}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{children}</h2>
  );
}

function OrgAdminSection() {
  const org = useSessionStore((s) => s.session?.org);
  const { data } = useQuery({
    queryKey: ["dashboard", "orgAdmin", org?.id],
    queryFn: () => dashboardApi.getOrgAdminDashboard(),
    enabled: !!org,
  });

  if (!data) return null;

  const stats = [
    { label: "Active users", value: data.activeUsers },
    { label: "Completions (30d)", value: data.completionsLast30Days },
    { label: "Departments", value: data.departments },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{s.value}</p>
            <p className="text-xs text-text-tertiary">{s.label}</p>
          </Card>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Quick links
        </span>
        <Link href="/manage/users" className="font-medium text-accent hover:underline">
          Users →
        </Link>
        <Link href="/manage/roles" className="font-medium text-accent hover:underline">
          Roles →
        </Link>
        <Link href="/manage/settings" className="font-medium text-accent hover:underline">
          Settings →
        </Link>
      </div>
    </section>
  );
}

function InstructorSection() {
  const org = useSessionStore((s) => s.session?.org);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "instructor", org?.id],
    queryFn: () => dashboardApi.getInstructorDashboard(),
    enabled: !!org,
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading activity...</p>;
  if (!data) return null;

  if (data.empty) {
    return (
      <EmptyState
        icon={Inbox}
        title="No submissions yet"
        description="Once learners start your courses, you'll see activity here."
      />
    );
  }

  return (
    <>
      {data.needsGrading.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionHeading>Needs grading</SectionHeading>
          <Card className="divide-y divide-border">
            {data.needsGrading.map((row) => (
              <Link
                key={row.assignmentId}
                href={`/manage/assignments/${row.assignmentId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-alt"
              >
                <span className="min-w-0 truncate text-text-secondary">
                  {row.title} — {row.courseTitle}
                </span>
                <span className="shrink-0 font-semibold text-accent">{row.ungradedCount} →</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {data.lowEngagement.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionHeading>Low engagement</SectionHeading>
          <Card className="divide-y divide-border">
            {data.lowEngagement.map((row) => (
              <Link
                key={row.courseId}
                href={`/manage/courses/${row.courseId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-alt"
              >
                <span className="min-w-0 truncate text-text-secondary">
                  {row.notStartedCount}{" "}
                  {row.notStartedCount === 1 ? "learner hasn't" : "learners haven't"} started{" "}
                  {row.courseTitle}
                </span>
                <span className="shrink-0 font-semibold text-accent">→</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {data.recentSubmissions.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionHeading>Recent submissions</SectionHeading>
          <div className="flex flex-col gap-1.5">
            {data.recentSubmissions.map((row) => (
              <p key={row.submissionId} className="text-sm text-text-secondary">
                {row.learnerName} — {row.assignmentTitle} —{" "}
                <span className="text-text-tertiary">{relativeTime(row.submittedAt)}</span>
              </p>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ManagerSection() {
  const session = useSessionStore((s) => s.session);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "manager", session?.org.id, session?.user.id],
    queryFn: () => dashboardApi.getManagerDashboard(),
    enabled: !!session,
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading team...</p>;
  if (!data) return null;

  if (data.teamSize === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members assigned yet"
        description="Add people to your team from Users."
      />
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      <SectionHeading>Team completion</SectionHeading>
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {data.teamSize} {data.teamSize === 1 ? "person" : "people"}
          </span>
          <span className="font-semibold tabular-nums text-text-primary">
            {data.completionPercent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${data.completionPercent}%` }}
          />
        </div>
      </Card>

      {data.overdue.length > 0 && (
        <>
          <SectionHeading>Overdue</SectionHeading>
          <Card className="divide-y divide-border">
            {data.overdue.map((row, i) => (
              <div
                key={`${row.userId}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate text-text-secondary">
                  {row.learnerName} — {row.courseTitle}
                </span>
                <Badge variant="danger">
                  {row.daysOverdue} {row.daysOverdue === 1 ? "day" : "days"}
                </Badge>
              </div>
            ))}
          </Card>
        </>
      )}
    </section>
  );
}

function relativeTime(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
