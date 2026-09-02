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
import * as pathsApi from "@/lib/api/resources/paths";
import { ApiError } from "@/lib/api/errors";

export default function ManagePathsPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["paths", session?.org.id],
    queryFn: () => pathsApi.listPaths(),
    enabled: !!session && canEdit,
  });

  const create = useMutation({
    mutationFn: () => pathsApi.createPath({ title }),
    onSuccess: (path) => {
      qc.invalidateQueries({ queryKey: ["paths"] });
      setCreateOpen(false);
      setTitle("");
      router.push(`/manage/paths/${path.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => pathsApi.deletePath(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paths"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <AccessDenied title="Paths" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Paths</h1>
        <Button onClick={() => setCreateOpen(true)}>Create path</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        An ordered sequence of existing courses. Learners work through them one at a time.
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading paths...</p>
      ) : paths.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No paths yet</p>
          <p className="text-xs text-text-tertiary">
            Create one, then add published courses to it in the order you want them taken.
          </p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Name</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Courses</TableTh>
              <TableTh>Enrolled</TableTh>
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {paths.map((p) => (
              <TableRow key={p.id}>
                <TableTd>
                  <Link
                    href={`/manage/paths/${p.id}`}
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
                <TableTd>{p.courseCount}</TableTd>
                <TableTd>{p.enrolledCount || "—"}</TableTd>
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${p.title}`} />
                    <MenuContent>
                      <MenuItem onSelect={() => router.push(`/manage/paths/${p.id}`)}>
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
            <DialogTitle>Create path</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-title">Name</Label>
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New Sales Rep Ramp-up"
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
