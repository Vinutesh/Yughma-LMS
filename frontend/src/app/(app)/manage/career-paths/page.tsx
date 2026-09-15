"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { EmptyState } from "@/components/patterns/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as careerPathsApi from "@/lib/api/resources/careerPaths";
import { ApiError } from "@/lib/api/errors";

export default function ManageCareerPathsPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["careerPaths", session?.org.id],
    queryFn: () => careerPathsApi.listCareerPaths(),
    enabled: !!session && canEdit,
  });

  const create = useMutation({
    mutationFn: () => careerPathsApi.createCareerPath({ title }),
    onSuccess: (path) => {
      qc.invalidateQueries({ queryKey: ["careerPaths"] });
      setCreateOpen(false);
      setTitle("");
      router.push(`/manage/career-paths/${path.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => careerPathsApi.deleteCareerPath(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careerPaths"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <AccessDenied title="Career Paths" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Career Paths</h1>
        <Button onClick={() => setCreateOpen(true)}>Create career path</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        A target role plus the skills it requires — each resolved to whatever content already
        builds it. No org-chart modeling, just a named target.
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading career paths...</p>
      ) : paths.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No career paths yet"
          description="Name a target role, then add the skills someone needs to get there."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Target role</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Skills</TableTh>
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {paths.map((p) => (
              <TableRow key={p.id}>
                <TableTd>
                  <Link
                    href={`/manage/career-paths/${p.id}`}
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
                <TableTd>{p.skills.length}</TableTd>
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${p.title}`} />
                    <MenuContent>
                      <MenuItem onSelect={() => router.push(`/manage/career-paths/${p.id}`)}>
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
            <DialogTitle>Create career path</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-title">Target role</Label>
            <Input
              id="cp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Account Executive"
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
