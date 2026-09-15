"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as plansApi from "@/lib/api/resources/learningPlans";
import { ApiError } from "@/lib/api/errors";

export default function ManageLearningPlansPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["learningPlans", session?.org.id],
    queryFn: () => plansApi.listLearningPlans(),
    enabled: !!session && canEdit,
  });

  const create = useMutation({
    mutationFn: () => plansApi.createLearningPlan({ title }),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["learningPlans"] });
      setCreateOpen(false);
      setTitle("");
      router.push(`/manage/learning-plans/${plan.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => plansApi.deleteLearningPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learningPlans"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <AccessDenied title="Learning Plans" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Learning Plans</h1>
        <Button onClick={() => setCreateOpen(true)}>Create learning plan</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        A named, published bundle of learning paths — publish one to send learners through several
        paths as a single plan.
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading learning plans...</p>
      ) : plans.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No learning plans yet</p>
          <p className="text-xs text-text-tertiary">Group related learning paths under one name and description.</p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Name</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Paths</TableTh>
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableTd>
                  <Link
                    href={`/manage/learning-plans/${p.id}`}
                    className="font-medium text-text-primary hover:text-accent hover:underline"
                  >
                    {p.title}
                  </Link>
                </TableTd>
                <TableTd>
                  <Badge variant={p.status === "published" ? "success" : "neutral"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </TableTd>
                <TableTd>{p.pathIds.length}</TableTd>
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${p.title}`} />
                    <MenuContent>
                      <MenuItem onSelect={() => router.push(`/manage/learning-plans/${p.id}`)}>
                        Edit
                      </MenuItem>
                      <MenuItem
                        destructive
                        onSelect={() => {
                          setError(null);
                          remove.mutate(p.id);
                        }}
                      >
                        Delete
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create learning plan</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lp-title">Name</Label>
            <Input
              id="lp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New Manager Onboarding"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim()}
              loading={create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
