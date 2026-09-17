"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/patterns/EmptyState";
import { SearchInput } from "@/components/patterns/SearchInput";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";

/**
 * There is no more Catalog tab — courses aren't self-service anymore.
 * Access is a grant a Yughma Tech platform admin creates (see
 * `platform.ts`), so this only ever shows what's already been granted.
 */
export default function LearnerCoursesPage() {
  const session = useSessionStore((s) => s.session);
  const [search, setSearch] = useState("");

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-xl font-semibold text-text-primary">Courses</h1>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search courses..."
        aria-label="Search courses"
        className="mb-4"
      />
      {session && <MyCourses search={search} />}
    </div>
  );
}

function MyCourses({ search }: { search: string }) {
  const session = useSessionStore((s) => s.session)!;
  const { data: allCourses = [], isLoading } = useQuery({
    queryKey: ["myCourses", session.org.id, session.user.id],
    queryFn: () => coursesApi.listMyCourses(),
  });

  const courses = useMemo(
    () => allCourses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())),
    [allCourses, search],
  );

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading your courses...</p>;
  if (allCourses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nothing assigned yet"
        description="Courses show up here once your organization grants you access."
      />
    );
  }
  if (courses.length === 0) {
    return <EmptyState icon={Search} title="No matches" description="Try a different search." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {courses.map((c) => (
        <Card key={c.id} interactive className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/courses/${c.id}`}
                className="text-sm font-semibold text-text-primary hover:text-accent hover:underline"
              >
                {c.title}
              </Link>
              <p className="text-xs text-text-tertiary">
                {c.lessonCount} {c.lessonCount === 1 ? "lesson" : "lessons"} · {c.authorName}
              </p>
            </div>
            {c.enrollment.status === "completed" ? (
              <Badge variant="success">Completed</Badge>
            ) : (
              <div className="flex w-40 shrink-0 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                    style={{ width: `${c.progressPercent}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs tabular-nums text-text-tertiary">
                  {c.progressPercent}%
                </span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
