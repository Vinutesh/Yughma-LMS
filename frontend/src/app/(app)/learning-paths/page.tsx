"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useSessionStore } from "@/state/sessionStore";
import * as pathsApi from "@/lib/api/resources/paths";
import { ApiError } from "@/lib/api/errors";

export default function LearningPathsPage() {
  const [openPathId, setOpenPathId] = useState<string | null>(null);

  if (openPathId) {
    return <PathDetail pathId={openPathId} onBack={() => setOpenPathId(null)} />;
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Learning Paths</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Courses grouped into a sequence. Each one unlocks when you finish the one before it.
      </p>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Paths</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <MyPaths onOpen={setOpenPathId} />
        </TabsContent>
        <TabsContent value="catalog">
          <PathCatalog onOpen={setOpenPathId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MyPaths({ onOpen }: { onOpen: (id: string) => void }) {
  const session = useSessionStore((s) => s.session);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["myPaths", session?.org.id, session?.user.id],
    queryFn: () => pathsApi.listMyPaths(),
    enabled: !!session,
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading paths...</p>;

  if (paths.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <p className="text-sm font-semibold text-text-primary">You haven&apos;t joined a path yet</p>
        <p className="text-xs text-text-tertiary">Browse the catalog to find one.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {paths.map((path) => (
        <Card
          key={path.id}
          className="cursor-pointer p-4 hover:border-border-strong"
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
              className="h-full rounded-full bg-accent"
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

function PathCatalog({ onOpen }: { onOpen: (id: string) => void }) {
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["pathCatalog", session?.org.id, session?.user.id],
    queryFn: () => pathsApi.listPathCatalog(),
    enabled: !!session,
  });

  const join = useMutation({
    mutationFn: (pathId: string) => pathsApi.enrollInPath(pathId),
    onSuccess: (_result, pathId) => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["myPaths"] });
      qc.invalidateQueries({ queryKey: ["pathCatalog"] });
      onOpen(pathId);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading catalog...</p>;

  if (paths.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <p className="text-sm font-semibold text-text-primary">Nothing new right now</p>
        <p className="text-xs text-text-tertiary">
          You&apos;ve joined every published path available to you.
        </p>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}
      <div className="flex flex-col gap-2.5">
        {paths.map((path) => (
          <Card key={path.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{path.title}</p>
              <p className="text-xs text-text-tertiary">
                {path.description || `${path.courseCount} courses`}
              </p>
            </div>
            <Button
              size="sm"
              loading={join.isPending && join.variables === path.id}
              onClick={() => join.mutate(path.id)}
            >
              Join path
            </Button>
          </Card>
        ))}
      </div>
    </>
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
