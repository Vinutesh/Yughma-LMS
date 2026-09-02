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
import * as academiesApi from "@/lib/api/resources/academies";
import { ApiError } from "@/lib/api/errors";

export default function ManageAcademiesPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: academies = [], isLoading } = useQuery({
    queryKey: ["academies", session?.org.id],
    queryFn: () => academiesApi.listAcademies(),
    enabled: !!session && canEdit,
  });

  const create = useMutation({
    mutationFn: () => academiesApi.createAcademy({ title }),
    onSuccess: (academy) => {
      qc.invalidateQueries({ queryKey: ["academies"] });
      setCreateOpen(false);
      setTitle("");
      router.push(`/manage/academies/${academy.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => academiesApi.deleteAcademy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academies"] }),
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  if (!canEdit) return <AccessDenied title="Academies" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Academies</h1>
        <Button onClick={() => setCreateOpen(true)}>Create academy</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        A curated shelf of existing courses and paths. Published academies surface as a filter in
        the Courses Catalog — no nav item of their own.
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading academies...</p>
      ) : academies.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No academies yet</p>
          <p className="text-xs text-text-tertiary">
            Group related courses and paths under one name and description.
          </p>
        </Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Name</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Items</TableTh>
              <TableTh className="w-10" />
            </TableRow>
          </TableHead>
          <TableBody>
            {academies.map((a) => (
              <TableRow key={a.id}>
                <TableTd>
                  <Link
                    href={`/manage/academies/${a.id}`}
                    className="font-medium text-text-primary hover:text-accent hover:underline"
                  >
                    {a.title}
                  </Link>
                </TableTd>
                <TableTd>
                  <Badge variant={a.status === "published" ? "success" : "neutral"}>
                    {a.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </TableTd>
                <TableTd>{a.itemCount}</TableTd>
                <TableTd>
                  <Menu>
                    <MenuTrigger label={`Actions for ${a.title}`} />
                    <MenuContent>
                      <MenuItem onSelect={() => router.push(`/manage/academies/${a.id}`)}>
                        Edit
                      </MenuItem>
                      <MenuItem
                        destructive
                        onSelect={() => {
                          setError(null);
                          remove.mutate(a.id);
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
            <DialogTitle>Create academy</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ac-title">Name</Label>
            <Input
              id="ac-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sales Academy"
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
