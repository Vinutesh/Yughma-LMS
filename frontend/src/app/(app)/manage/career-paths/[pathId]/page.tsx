"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as careerPathsApi from "@/lib/api/resources/careerPaths";
import * as skillsApi from "@/lib/api/resources/skills";
import { ApiError } from "@/lib/api/errors";

export default function CareerPathBuilderPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const canEdit = usePermission("courses", "edit");

  const { data: path, isLoading } = useQuery({
    queryKey: ["careerPath", pathId],
    queryFn: () => careerPathsApi.getCareerPath(pathId),
    enabled: canEdit,
  });

  if (!canEdit) return <ComingSoon title="Career path builder" />;
  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading career path...</p>;
  if (!path) return <p className="p-8 text-sm text-text-tertiary">Career path not found.</p>;

  return <Builder key={path.id} path={path} />;
}

function Builder({ path }: { path: careerPathsApi.CareerPathDetail }) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState("");

  const { data: allSkills = [] } = useQuery({
    queryKey: ["skills", org?.id],
    queryFn: () => skillsApi.listSkills(),
    enabled: !!org,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["careerPath", path.id] });
    qc.invalidateQueries({ queryKey: ["careerPaths"] });
  };

  const setSkills = useMutation({
    mutationFn: (skillIds: string[]) => careerPathsApi.setCareerPathSkills(path.id, skillIds),
    onSuccess: () => {
      setToAdd("");
      invalidate();
    },
  });

  const publish = useMutation({
    mutationFn: () => careerPathsApi.publishCareerPath(path.id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const candidates = allSkills.filter((s) => !path.skillIds.includes(s.id));

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/manage/career-paths"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Career Paths
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{path.title}</h1>
          <Badge className="mt-1" variant={path.status === "published" ? "success" : "neutral"}>
            {path.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {path.status === "draft" && (
          <Button loading={publish.isPending} onClick={() => publish.mutate()}>
            Publish
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {path.skills.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm font-semibold text-text-primary">No skills yet</p>
            <p className="text-xs text-text-tertiary">
              Add the skills someone needs to reach this role.
            </p>
          </Card>
        ) : (
          path.skills.map((skill, i) => (
            <Card key={skill.skillId} className="flex items-start gap-3 p-3.5">
              <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-text-tertiary">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{skill.skillName}</p>
                <p className="text-xs text-text-tertiary">
                  {skill.resolvedTo.length === 0
                    ? "No content yet"
                    : `→ ${skill.resolvedTo.map((r) => r.title).join(", ")}`}
                </p>
              </div>
              <button
                aria-label={`Remove ${skill.skillName}`}
                onClick={() =>
                  setSkills.mutate(path.skillIds.filter((id) => id !== skill.skillId))
                }
                className="rounded p-0.5 text-text-tertiary hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </Card>
          ))
        )}

        {candidates.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Add skill"
              value={toAdd}
              onChange={(e) => setToAdd(e.target.value)}
              className="h-9 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option value="">Add skill...</option>
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!toAdd}
              loading={setSkills.isPending}
              onClick={() => setSkills.mutate([...path.skillIds, toAdd])}
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
