"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/patterns/EmptyState";
import { useSessionStore } from "@/state/sessionStore";
import * as skillsApi from "@/lib/api/resources/skills";

export default function MySkillsPage() {
  const session = useSessionStore((s) => s.session);
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["mySkills", session?.org.id, session?.user.id],
    queryFn: () => skillsApi.getMySkills(),
    enabled: !!session,
  });

  const open = skills.find((s) => s.skillId === openSkillId) ?? null;

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading skills...</p>;

  if (open) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <button
          onClick={() => setOpenSkillId(null)}
          className="mb-3 text-sm font-medium text-accent hover:underline"
        >
          ← My Skills
        </button>
        <h1 className="mb-5 text-xl font-semibold text-text-primary">{open.name}</h1>

        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Built through
        </h2>
        {open.completedCourses.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Nothing completed yet — {open.inProgressCount}{" "}
            {open.inProgressCount === 1 ? "course is" : "courses are"} in progress.
          </p>
        ) : (
          <Card className="divide-y divide-border">
            {open.completedCourses.map((course) => (
              <Link
                key={course.courseId}
                href={`/courses/${course.courseId}`}
                className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-surface-alt"
              >
                <Check className="size-4 shrink-0 text-success" />
                <span className="min-w-0 flex-1 truncate text-text-secondary">{course.title}</span>
                <span className="shrink-0 text-xs text-text-tertiary">
                  completed {formatDate(course.completedAt)}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">My Skills</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        What the courses you take are building. Progress is the number of courses you&apos;ve
        completed for each skill.
      </p>

      {skills.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No skills tracked yet"
          description="Enroll in a course that builds a skill and it'll show up here."
        />
      ) : (
        <Card className="divide-y divide-border">
          {skills.map((skill) => {
            const count = skill.completedCourses.length;
            return (
              <button
                key={skill.skillId}
                onClick={() => setOpenSkillId(skill.skillId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-alt"
              >
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                  {skill.name}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-text-tertiary">
                  {count > 0 && (
                    <Badge variant="success">
                      {count} {count === 1 ? "course" : "courses"} completed
                    </Badge>
                  )}
                  {skill.inProgressCount > 0 && (
                    <Badge variant="neutral">{skill.inProgressCount} in progress</Badge>
                  )}
                </span>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
