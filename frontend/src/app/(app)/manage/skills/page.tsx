"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as skillsApi from "@/lib/api/resources/skills";
import { ApiError } from "@/lib/api/errors";

export default function SkillsPage() {
  const canEdit = usePermission("courses", "edit");
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["skills", org?.id],
    queryFn: () => skillsApi.listSkills(),
    enabled: !!org && canEdit,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["skills"] });

  const archive = useMutation({
    mutationFn: (id: string) => skillsApi.archiveSkill(id),
    onSuccess: invalidate,
  });

  if (!canEdit) return <ComingSoon title="Skills" />;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Skills</h1>
        <Button onClick={() => setCreateOpen(true)}>Create skill</Button>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        Tag courses with the skills they build. Learners see their progress on My Skills.
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading skills...</p>
      ) : skills.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">No skills yet</p>
          <p className="text-xs text-text-tertiary">
            Create a few, then map them to courses from each course&apos;s Settings tab.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {skills.map((skill) => (
            <div key={skill.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{skill.name}</p>
                <p className="text-xs text-text-tertiary">
                  {skill.courseCount === 0
                    ? "Not mapped to any course yet"
                    : `${skill.courseCount} ${skill.courseCount === 1 ? "course" : "courses"}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {skill.courseCount > 0 && <Badge variant="neutral">{skill.courseCount}</Badge>}
                <Menu>
                  <MenuTrigger label={`Actions for ${skill.name}`} />
                  <MenuContent>
                    <MenuItem onSelect={() => setRenaming({ id: skill.id, name: skill.name })}>
                      Rename
                    </MenuItem>
                    <MenuItem destructive onSelect={() => archive.mutate(skill.id)}>
                      Archive
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            </div>
          ))}
        </Card>
      )}

      <SkillDialog
        key={renaming?.id ?? "create"}
        open={createOpen || !!renaming}
        title={renaming ? "Rename skill" : "Create skill"}
        initialName={renaming?.name ?? ""}
        submitLabel={renaming ? "Save" : "Create"}
        onSubmit={(name) =>
          renaming ? skillsApi.renameSkill(renaming.id, name) : skillsApi.createSkill(name)
        }
        onDone={() => {
          invalidate();
          setCreateOpen(false);
          setRenaming(null);
        }}
        onCancel={() => {
          setCreateOpen(false);
          setRenaming(null);
        }}
      />
    </div>
  );
}

/** Create and rename share one form — the only differences are the labels and
 * which resource call runs, so they don't warrant separate components. */
function SkillDialog({
  open,
  title,
  initialName,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
}: {
  open: boolean;
  title: string;
  initialName: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => onSubmit(name),
    onSuccess: () => {
      setError(null);
      setName("");
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="skill-name">Name</Label>
          <Input
            id="skill-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Consultative Selling"
          />
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
