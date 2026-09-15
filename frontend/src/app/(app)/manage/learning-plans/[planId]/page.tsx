"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as plansApi from "@/lib/api/resources/learningPlans";
import * as pathsApi from "@/lib/api/resources/paths";
import { ApiError } from "@/lib/api/errors";

export default function LearningPlanBuilderPage() {
  const { planId } = useParams<{ planId: string }>();
  const canEdit = usePermission("courses", "edit");

  const { data: plan, isLoading } = useQuery({
    queryKey: ["learningPlan", planId],
    queryFn: () => plansApi.getLearningPlan(planId),
    enabled: canEdit,
  });

  if (!canEdit) return <AccessDenied title="Learning plan builder" />;
  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading learning plan...</p>;
  if (!plan) return <p className="p-8 text-sm text-text-tertiary">Learning plan not found.</p>;

  return <Builder key={plan.id} plan={plan} />;
}

function Builder({ plan }: { plan: plansApi.LearningPlanSummary }) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [description, setDescription] = useState(plan.description);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: paths = [] } = useQuery({
    queryKey: ["paths", org?.id],
    queryFn: () => pathsApi.listPaths(),
    enabled: !!org,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["learningPlan", plan.id] });
    qc.invalidateQueries({ queryKey: ["learningPlans"] });
  };

  const saveDescription = useMutation({
    mutationFn: () => plansApi.updateLearningPlan(plan.id, { description }),
    onSuccess: () => {
      invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const setPaths = useMutation({
    mutationFn: (pathIds: string[]) => plansApi.updateLearningPlan(plan.id, { pathIds }),
    onSuccess: invalidate,
  });

  const publish = useMutation({
    mutationFn: () => plansApi.publishLearningPlan(plan.id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const pathItems = plan.pathIds.flatMap((id) => {
    const p = paths.find((p) => p.id === id);
    return p ? [{ id, title: p.title }] : [];
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/manage/learning-plans"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Learning Plans
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{plan.title}</h1>
          <Badge className="mt-1" variant={plan.status === "published" ? "success" : "neutral"}>
            {plan.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {plan.status === "draft" && (
          <Button loading={publish.isPending} onClick={() => publish.mutate()}>
            Publish
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      <Card className="mb-4 flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lp-desc">Description</Label>
          <textarea
            id="lp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" loading={saveDescription.isPending} onClick={() => saveDescription.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      </Card>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Learning Paths</p>
      <Card className="mb-3 flex flex-col gap-1 p-3">
        {pathItems.length === 0 ? (
          <p className="px-1 py-2 text-xs text-text-tertiary">No paths added yet.</p>
        ) : (
          pathItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-1 py-1.5 text-sm">
              <span className="text-text-secondary">{item.title}</span>
              <button
                aria-label={`Remove ${item.title}`}
                onClick={() => setPaths.mutate(plan.pathIds.filter((id) => id !== item.id))}
                className="rounded p-0.5 text-text-tertiary hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </Card>
      <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
        + Add path...
      </Button>

      <PathPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        paths={paths.filter((p) => p.status === "published" && !plan.pathIds.includes(p.id))}
        onAdd={(pathIds) => {
          setPaths.mutate([...plan.pathIds, ...pathIds]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function PathPickerDialog({
  open,
  onOpenChange,
  paths,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paths: { id: string; title: string }[];
  onAdd: (pathIds: string[]) => void;
}) {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelectedPaths([]);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add learning paths</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {paths.length > 0 ? (
            paths.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-alt">
                <input
                  type="checkbox"
                  checked={selectedPaths.includes(p.id)}
                  onChange={(e) =>
                    setSelectedPaths((prev) =>
                      e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                    )
                  }
                  className="size-4 accent-accent"
                />
                <span className="text-text-secondary">{p.title}</span>
              </label>
            ))
          ) : (
            <p className="py-4 text-center text-xs text-text-tertiary">Nothing left to add.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selectedPaths.length === 0} onClick={() => onAdd(selectedPaths)}>
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
