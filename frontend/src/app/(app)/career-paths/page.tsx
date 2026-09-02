"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useSessionStore } from "@/state/sessionStore";
import * as careerPathsApi from "@/lib/api/resources/careerPaths";

export default function CareerPathsPage() {
  const session = useSessionStore((s) => s.session);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["myCareerPaths", session?.org.id, session?.user.id],
    queryFn: () => careerPathsApi.listMyCareerPaths(),
    enabled: !!session,
  });

  const open = paths.find((p) => p.id === openId) ?? null;

  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading career paths...</p>;

  if (open) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <button
          onClick={() => setOpenId(null)}
          className="mb-3 text-sm font-medium text-accent hover:underline"
        >
          ← Career Paths
        </button>
        <h1 className="mb-5 text-xl font-semibold text-text-primary">{open.title}</h1>

        <div className="flex flex-col gap-2">
          {open.skills.map((skill) => {
            const built = open.builtSkillIds.includes(skill.skillId);
            return (
              <Card key={skill.skillId} className="flex items-center gap-2.5 p-3.5">
                {built ? (
                  <Check className="size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="size-3 shrink-0 text-text-tertiary" />
                )}
                <span className={"flex-1 text-sm " + (built ? "text-text-primary" : "text-text-secondary")}>
                  {skill.skillName}
                </span>
                {skill.resolvedTo.length === 0 ? (
                  <span className="text-xs text-text-tertiary">No content yet</span>
                ) : !built ? (
                  <Link
                    href={skill.resolvedTo[0].kind === "path" ? `/learning-paths` : `/courses/${skill.resolvedTo[0].id}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Start: {skill.resolvedTo[0].title} →
                  </Link>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Career Paths</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Target roles and the skills they need — track how close you are to each.
      </p>

      {paths.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Nothing published yet</p>
          <p className="text-xs text-text-tertiary">Check back once your org sets one up.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {paths.map((path) => (
            <Card
              key={path.id}
              className="cursor-pointer p-4 hover:border-border-strong"
              onClick={() => setOpenId(path.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-text-primary">{path.title}</span>
                <span className="text-xs text-text-tertiary">
                  {path.builtSkillIds.length} of {path.skills.length} skills
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
