"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import * as integrationsApi from "@/lib/api/resources/integrations";
import { ApiError } from "@/lib/api/errors";

export function ApiKeysTab() {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["apiKeys", org?.id],
    queryFn: () => integrationsApi.listApiKeys(),
    enabled: !!org,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => integrationsApi.revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  const active = keys.filter((k) => !k.revoked);

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading keys...</p>
      ) : active.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No API keys yet</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Name</TableTh>
                <TableTh>Key</TableTh>
                <TableTh>Last used</TableTh>
                <TableTh className="w-10" />
              </TableRow>
            </TableHead>
            <TableBody>
              {active.map((key) => (
                <TableRow key={key.id}>
                  <TableTd>{key.name}</TableTd>
                  <TableTd className="font-mono text-xs">{key.maskedKey}</TableTd>
                  <TableTd className="text-xs text-text-tertiary">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : "Never"}
                  </TableTd>
                  <TableTd>
                    <Menu>
                      <MenuTrigger label={`Actions for ${key.name}`} />
                      <MenuContent>
                        <MenuItem destructive onSelect={() => revoke.mutate(key.id)}>
                          Revoke
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {keys.some((k) => k.revoked) && (
        <p className="text-xs text-text-tertiary">
          {keys.filter((k) => k.revoked).length} revoked key(s) hidden.
        </p>
      )}
      <div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Generate key
        </Button>
      </div>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(fullKey) => setCreatedKey(fullKey)}
      />

      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">Copy it now — it won&apos;t be shown again:</p>
          <code className="block break-all rounded-md bg-surface-alt p-2.5 text-xs">{createdKey}</code>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (fullKey: string) => void;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => integrationsApi.createApiKey(name),
    onSuccess: (result) => {
      setError(null);
      setName("");
      qc.invalidateQueries({ queryKey: ["apiKeys"] });
      onOpenChange(false);
      onCreated(result.fullKey);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate API key</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="key-name">Name</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zapier integration"
          />
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} loading={create.isPending} onClick={() => create.mutate()}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
