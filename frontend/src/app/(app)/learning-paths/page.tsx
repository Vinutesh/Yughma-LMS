"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Lock, Route, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/patterns/EmptyState";
import { SearchInput } from "@/components/patterns/SearchInput";
import { useSessionStore } from "@/state/sessionStore";
import * as pathsApi from "@/lib/api/resources/paths";

/**
 * No more Catalog/self-service join — access to a Learning Path is a grant
 * a platform admin creates (see `platform.ts`'s `grantPathAccess`), same
 * model Course access already uses. This only ever shows paths the learner
 * has actually been granted.
 */
export default function LearningPathsPage() {
  // `?open=<pathId>` lets other screens (the Learning Plans catalog) deep
  // link straight into a specific path's detail view.
  const searchParams = useSearchParams();
  const [openPathId, setOpenPathId] = useState<string | null>(searchParams.get("open"));
  const [search, setSearch] = useState("");

  if (openPathId) {
    return <PathDetail pathId={openPathId} onBack={() => setOpenPathId(null)} />;
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Learning Paths</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Courses grouped into a sequence. Each one unlocks when you finish the one before it.
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search paths..."
        aria-label="Search learning paths"
        className="mb-4"
      />

      <MyPaths onOpen={setOpenPathId} search={search} />
    </div>
  );
}

function MyPaths({ onOpen, search }: { onOpen: (id: string) => void; search: string }) {
  const session = useSessionStore((s) => s.session);

  const { data: allPaths = [], isLoading } = useQuery({
    queryKey: ["myPaths", session?.org.id, session?.user.id],
    queryFn: () => pathsApi.listMyPaths(),
    enabled: !!session,
  });

  const paths = useMemo(
    () => allPaths.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
    [allPaths, search],
  );

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading paths...</p>;

  if (allPaths.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="No paths assigned yet"
        description="Paths show up here once your organization grants you access."
      />
    );
  }

  if (paths.length === 0) {
    return <EmptyState icon={Search} title="No matches" description="Try a different search." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {paths.map((path) => (
        <Card
          key={path.id}
          interactive
          className="cursor-pointer p-4"
          onClick={() => onOpen(path.id)}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
              {path.title}
            </span>
            <span className="shrink-0 text-xs text-text-tertiary">
              {path.completedCount} of {path.courseCount} courses
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
              style={{
                width: `${path.courseCount === 0 ? 0 : (path.completedCount / path.courseCount) * 100}%`,
              }}
            />
          </div>
          {path.enrollment?.completedAt && (
            <Badge className="mt-2.5" variant="success">
              Path complete
            </Badge>
          )}
        </Card>
      ))}
    </div>
  );
}

function PathDetail({ pathId, onBack }: { pathId: string; onBack: () => void }) {
  const session = useSessionStore((s) => s.session);

  const { data: path, isLoading } = useQuery({
    queryKey: ["path", pathId, session?.user.id],
    queryFn: () => pathsApi.getPath(pathId),
    enabled: !!session,
  });

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading path...</p>;
  if (!path) return <p className="p-8 text-sm text-text-tertiary">Path not found.</p>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <button onClick={onBack} className="mb-3 text-sm font-medium text-accent hover:underline">
        ← My Paths
      </button>

      <h1 className="text-xl font-semibold text-text-primary">{path.title}</h1>
      <p className="mb-5 mt-1 text-sm text-text-tertiary">
        {path.description || `${path.courseCount} courses in order`}
      </p>

      <div className="flex flex-col gap-2">
        {path.steps.map((step, i) => (
          <Card
            key={step.courseId}
            className={"flex items-center gap-3 p-3.5" + (step.status === "locked" ? " opacity-60" : "")}
          >
            <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-text-tertiary">
              {i + 1}.
            </span>
            {step.status === "locked" ? (
              <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                {step.title}
              </span>
            ) : (
              <Link
                href={`/courses/${step.courseId}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary hover:text-accent hover:underline"
              >
                {step.title}
              </Link>
            )}
            <StepStatus status={step.status} progressPercent={step.progressPercent} />
          </Card>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          {path.completedCount} of {path.courseCount} complete
        </span>
        {path.nextCourseId ? (
          <Button asChild>
            <Link href={`/courses/${path.nextCourseId}`}>Continue →</Link>
          </Button>
        ) : (
          <Badge variant="success">Path complete</Badge>
        )}
      </div>
    </div>
  );
}

function StepStatus({
  status,
  progressPercent,
}: {
  status: pathsApi.PathStepState;
  progressPercent: number;
}) {
  if (status === "done") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-success">
        <Check className="size-3.5" /> done
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent">
        <Circle className="size-2 fill-current" /> {progressPercent}% in progress
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-tertiary">
        <Lock className="size-3.5" /> locked
      </span>
    );
  }
  return <span className="shrink-0 text-xs text-text-tertiary">not started</span>;
}
