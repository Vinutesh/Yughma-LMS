"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as certificatesApi from "@/lib/api/resources/certificates";
import * as usersApi from "@/lib/api/resources/users";
import type { CertificateView } from "@/lib/api/resources/certificates";
import { ApiError } from "@/lib/api/errors";
import { formatLongDate } from "@/components/certificates/CertificateFace";

export default function ManageCertificatesPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [revoking, setRevoking] = useState<CertificateView | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["certificates", session?.org.id],
    queryFn: () => certificatesApi.listCertificates(),
    enabled: !!session && canEdit,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["certificates"] });
    qc.invalidateQueries({ queryKey: ["myCertificates"] });
  };

  const revoke = useMutation({
    mutationFn: (id: string) => certificatesApi.revokeCertificate(id),
    onSuccess: () => {
      invalidate();
      setRevoking(null);
    },
  });

  if (!canEdit) return <AccessDenied title="Certificates" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Certificates</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setTemplatesOpen(true)}>
            Manage names
          </Button>
          <Button size="sm" onClick={() => setIssueOpen(true)}>
            Issue manually
          </Button>
        </div>
      </div>
      <p className="mb-5 text-sm text-text-tertiary">
        Everything issued across the organization. Revoking keeps the public link working — it just
        reports the certificate as revoked.
      </p>

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading certificates...</p>
      ) : certificates.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Nothing issued yet</p>
          <p className="text-xs text-text-tertiary">
            Set a certificate on a course or path, or issue one by hand.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Recipient</TableTh>
                <TableTh>Earned for</TableTh>
                <TableTh>Issued</TableTh>
                <TableTh>{""}</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.map((certificate) => (
                <TableRow key={certificate.id}>
                  <TableTd>
                    <span className="font-medium text-text-primary">
                      {certificate.recipientName}
                    </span>
                  </TableTd>
                  <TableTd>
                    <span className="text-text-secondary">{certificate.sourceTitle}</span>
                    {certificate.sourceKind === "manual" && (
                      <Badge className="ml-2" variant="neutral">
                        Manual
                      </Badge>
                    )}
                  </TableTd>
                  <TableTd>
                    <span className="text-text-tertiary">
                      {formatLongDate(certificate.issuedAt)}
                    </span>
                  </TableTd>
                  <TableTd>
                    <div className="flex items-center justify-end gap-2">
                      {certificate.revoked ? (
                        <Badge variant="danger">Revoked</Badge>
                      ) : (
                        <Menu>
                          <MenuTrigger
                            label={`Actions for ${certificate.recipientName}'s certificate`}
                          />
                          <MenuContent>
                            <MenuItem destructive onSelect={() => setRevoking(certificate)}>
                              Revoke
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      )}
                    </div>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <IssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onIssued={() => {
          invalidate();
          setIssueOpen(false);
        }}
      />

      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />

      <Dialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke {revoking?.recipientName}&apos;s certificate?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            The public verification link will show it as revoked, not disappear.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={revoke.isPending}
              onClick={() => revoking && revoke.mutate(revoking.id)}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IssueDialog({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onIssued: () => void;
}) {
  const session = useSessionStore((s) => s.session);
  const [userId, setUserId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers", session?.org.id],
    queryFn: () => usersApi.listUsers(),
    enabled: !!session && open,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["certificateTemplates", session?.org.id],
    queryFn: () => certificatesApi.listTemplates(),
    enabled: !!session && open,
  });

  const issue = useMutation({
    mutationFn: () => certificatesApi.issueManually({ userId, templateId }),
    onSuccess: () => {
      setError(null);
      setUserId("");
      setTemplateId("");
      onIssued();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue certificate</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issue-user">Recipient</Label>
            <select
              id="issue-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option value="">Select...</option>
              {users
                .filter((u) => u.status === "active")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issue-template">Certificate</Label>
            <select
              id="issue-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option value="">Select...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!userId || !templateId}
            loading={issue.isPending}
            onClick={() => issue.mutate()}
          >
            Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** v1 has no visual designer, so a "template" is just a name that courses
 * and paths can point at. This is the only place they're created. */
function TemplatesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["certificateTemplates", org?.id],
    queryFn: () => certificatesApi.listTemplates(),
    enabled: !!org && open,
  });

  const create = useMutation({
    mutationFn: () => certificatesApi.createTemplate(name),
    onSuccess: () => {
      setError(null);
      setName("");
      qc.invalidateQueries({ queryKey: ["certificateTemplates"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Certificate names</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-text-tertiary">
          One fixed layout in this version — the name is what appears on the certificate and in the
          award dropdowns.
        </p>
        {templates.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {templates.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary"
              >
                {t.name}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="tpl-name">Add a certificate</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sales Fundamentals Completion"
            />
          </div>
          <Button
            disabled={!name.trim()}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Add
          </Button>
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
