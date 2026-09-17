"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Layers, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/patterns/EmptyState";
import { SearchInput } from "@/components/patterns/SearchInput";
import { useSessionStore } from "@/state/sessionStore";
import * as plansApi from "@/lib/api/resources/learningPlans";
import * as pathsApi from "@/lib/api/resources/paths";

/**
 * Learner-facing catalog for Learning Plans — a named, published bundle of
 * Learning Paths. There's no separate "enrollment" concept of its own here:
 * a plan is just a curated list of paths, so opening one shows its member
 * paths and hands off to the real Learning Paths flow (join/continue/
 * progress) for each — see `learning-paths/page.tsx`'s `?open=` handling.
 */
export default function LearningPlansPage() {
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (openPlanId) {
    return <PlanDetail planId={openPlanId} onBack={() => setOpenPlanId(null)} />;
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Learning Plans</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Named bundles of learning paths — everything you need for a role or initiative, grouped
        together.
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search plans..."
        aria-label="Search learning plans"
        className="mb-4"
      />

      <PlanList onOpen={setOpenPlanId} search={search} />
    </div>
  );
}

function PlanList({ onOpen, search }: { onOpen: (id: string) => void; search: string }) {
  const session = useSessionStore((s) => s.session);

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ["publishedLearningPlans", session?.org.id],
    queryFn: () => plansApi.listPublishedLearningPlans(),
    enabled: !!session,
  });

  const plans = useMemo(
    () => allPlans.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
    [allPlans, search],
  );

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading learning plans...</p>;

  if (allPlans.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No learning plans yet"
        description="Your organization hasn't published one yet."
      />
    );
  }

  if (plans.length === 0) {
    return <EmptyState icon={Search} title="No matches" description="Try a different search." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          interactive
          className="cursor-pointer p-4"
          onClick={() => onOpen(plan.id)}
        >
          <p className="text-sm font-semibold text-text-primary">{plan.title}</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {plan.description || `${plan.pathIds.length} ${plan.pathIds.length === 1 ? "path" : "paths"}`}
          </p>
        </Card>
      ))}
    </div>
  );
}

function PlanDetail({ planId, onBack }: { planId: string; onBack: () => void }) {
  const session = useSessionStore((s) => s.session);
  const router = useRouter();

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["learningPlan", planId],
    queryFn: () => plansApi.getLearningPlan(planId),
    enabled: !!session,
  });

  const { data: catalogPaths = [] } = useQuery({
    queryKey: ["pathCatalog", session?.org.id, session?.user.id],
    queryFn: () => pathsApi.listPathCatalog(),
    enabled: !!session,
  });

  const { data: myPaths = [] } = useQuery({
    queryKey: ["myPaths", session?.org.id, session?.user.id],
    queryFn: () => pathsApi.listMyPaths(),
    enabled: !!session,
  });

  if (planLoading) return <p className="p-8 text-sm text-text-tertiary">Loading plan...</p>;
  if (!plan) return <p className="p-8 text-sm text-text-tertiary">Learning plan not found.</p>;

  const myPathById = new Map(myPaths.map((p) => [p.id, p]));
  const paths = plan.pathIds.flatMap((id) => {
    const summary = catalogPaths.find((p) => p.id === id) ?? myPaths.find((p) => p.id === id);
    return summary ? [{ id, title: summary.title, courseCount: summary.courseCount }] : [];
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <button onClick={onBack} className="mb-3 text-sm font-medium text-accent hover:underline">
        ← Learning Plans
      </button>

      <h1 className="text-xl font-semibold text-text-primary">{plan.title}</h1>
      <p className="mb-5 mt-1 text-sm text-text-tertiary">
        {plan.description || `${paths.length} ${paths.length === 1 ? "path" : "paths"} in this plan`}
      </p>

      <div className="flex flex-col gap-2">
        {paths.map((path, i) => {
          const mine = myPathById.get(path.id);
          const done = !!mine?.enrollment?.completedAt;
          return (
            <Card
              key={path.id}
              interactive
              className="flex cursor-pointer items-center gap-3 p-3.5"
              onClick={() => router.push(`/learning-paths?open=${path.id}`)}
            >
              <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-text-tertiary">
                {i + 1}.
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                {path.title}
              </span>
              {done ? (
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-success">
                  <Check className="size-3.5" /> done
                </span>
              ) : mine ? (
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent">
                  <Circle className="size-2 fill-current" /> in progress
                </span>
              ) : (
                <Badge variant="neutral">{path.courseCount} courses</Badge>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
