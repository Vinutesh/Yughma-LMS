"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as certificatesApi from "@/lib/api/resources/certificates";
import * as usersApi from "@/lib/api/resources/users";
import type { CertificateView } from "@/lib/api/resources/certificates";
import { ApiError } from "@/lib/api/errors";
import { formatLongDate } from "@/components/certificates/CertificateFace";
import type { CertificateOverlayLayout, CertificateTemplate } from "@/types/domain";

export default function ManageCertificatesPage() {
  const canEdit = usePermission("courses", "edit");
  const session = useSessionStore((s) => s.session);
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [revoking, setRevoking] = useState<CertificateView | null>(null);
  const [deleting, setDeleting] = useState<CertificateView | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [designingTemplate, setDesigningTemplate] = useState<CertificateTemplate | null>(null);

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

  const deleteCert = useMutation({
    mutationFn: (id: string) => certificatesApi.deleteCertificate(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
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
        <EmptyState
          icon={Award}
          title="Nothing issued yet"
          description="Set a certificate on a course or path, or issue one by hand."
        />
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
                      {certificate.revoked && <Badge variant="danger">Revoked</Badge>}
                      <Menu>
                        <MenuTrigger
                          label={`Actions for ${certificate.recipientName}'s certificate`}
                        />
                        <MenuContent>
                          {!certificate.revoked && (
                            <MenuItem destructive onSelect={() => setRevoking(certificate)}>
                              Revoke
                            </MenuItem>
                          )}
                          <MenuItem destructive onSelect={() => setDeleting(certificate)}>
                            Delete permanently
                          </MenuItem>
                        </MenuContent>
                      </Menu>
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

      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onDesign={(t) => {
          setTemplatesOpen(false);
          setDesigningTemplate(t);
        }}
      />

      <TemplateDesignDialog
        template={designingTemplate}
        onOpenChange={(v) => !v && setDesigningTemplate(null)}
      />

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

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete {deleting?.recipientName}&apos;s certificate?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Unlike Revoke, this removes the record entirely — the public verification link will
            report it as unknown, not revoked. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteCert.isPending}
              onClick={() => deleting && deleteCert.mutate(deleting.id)}
            >
              Delete permanently
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

/** A "template" is a name plus, optionally, an uploaded background design
 * with dynamic fields positioned on it (see `TemplateDesignDialog`). This
 * is the only place templates are created; designing one happens in the
 * separate dialog `onDesign` opens. */
function TemplatesDialog({
  open,
  onOpenChange,
  onDesign,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDesign: (template: CertificateTemplate) => void;
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
          The name appears in award dropdowns. Design a background to replace the app&apos;s
          default certificate layout for that name.
        </p>
        {templates.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-text-secondary"
              >
                <span>
                  {t.name}
                  {t.backgroundAssetId && (
                    <span className="ml-2 text-xs text-text-tertiary">Custom design</span>
                  )}
                </span>
                <Button size="sm" variant="secondary" onClick={() => onDesign(t)}>
                  Design
                </Button>
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

const DEFAULT_LAYOUT: CertificateOverlayLayout = {
  name: { x: 50, y: 38 },
  course: { x: 50, y: 55 },
  date: { x: 20, y: 88 },
};

const FIELD_LABELS: Record<keyof CertificateOverlayLayout, string> = {
  name: "Recipient name",
  course: "Course",
  date: "Date",
};

/**
 * Upload (or pick from the Content Library) a background design, then drag
 * three markers onto it to say where the recipient's name, course, and
 * issue date should land — the same three fields every certificate has
 * always shown, now placed wherever this specific design's blank lines
 * are instead of the app's fixed layout. Removing the background reverts
 * this template to that fixed layout.
 */
function TemplateDesignDialog({
  template,
  onOpenChange,
}: {
  template: CertificateTemplate | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layout, setLayout] = useState<CertificateOverlayLayout>(template?.overlayLayout ?? DEFAULT_LAYOUT);
  const [dragging, setDragging] = useState<keyof CertificateOverlayLayout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The prop only ever reflects the template as it was the moment "Design"
  // was clicked — every mutation below returns the freshly updated row, so
  // that response (not the stale prop) is what actually drives what's
  // rendered from then on. Without this, setting a background here still
  // showed the empty "Upload background" state afterward, because nothing
  // ever told this dialog the prop it opened with was now out of date.
  const [current, setCurrent] = useState(template);

  // Re-seed local state whenever a different template opens, rather than
  // carrying over the previous template's in-progress positions.
  useEffect(() => {
    setCurrent(template);
    setLayout(template?.overlayLayout ?? DEFAULT_LAYOUT);
  }, [template]);

  const { data: background } = useQuery({
    queryKey: ["templateBackground", current?.id, current?.backgroundAssetId],
    queryFn: () => certificatesApi.getTemplateBackgroundUrl(current!.id),
    enabled: !!current?.backgroundAssetId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["certificateTemplates"] });

  const setBackground = useMutation({
    mutationFn: (assetId: string) => certificatesApi.updateTemplate(current!.id, { backgroundAssetId: assetId }),
    onSuccess: (updated) => {
      invalidate();
      setCurrent(updated);
      setPickerOpen(false);
    },
  });

  const removeBackground = useMutation({
    mutationFn: () => certificatesApi.updateTemplate(current!.id, { backgroundAssetId: null, overlayLayout: null }),
    onSuccess: (updated) => {
      invalidate();
      setCurrent(updated);
      setLayout(DEFAULT_LAYOUT);
    },
  });

  const savePositions = useMutation({
    mutationFn: () => certificatesApi.updateTemplate(current!.id, { overlayLayout: layout }),
    onSuccess: (updated) => {
      invalidate();
      setCurrent(updated);
    },
  });

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      setLayout((prev) => ({ ...prev, [dragging as keyof CertificateOverlayLayout]: { x, y } }));
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  if (!current) return null;

  if (pickerOpen) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload a background for &quot;{current.name}&quot;</DialogTitle>
          </DialogHeader>
          <ContentLibrary
            mode="picker"
            onUseSelected={(asset) => setBackground.mutate(asset.id)}
          />
          {setBackground.isPending && (
            <p className="text-xs text-text-tertiary">Saving background...</p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Design &quot;{current.name}&quot;</DialogTitle>
        </DialogHeader>

        {!current.backgroundAssetId ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-sm text-text-secondary">
              No background uploaded yet — this certificate uses the app&apos;s default layout.
            </p>
            <Button onClick={() => setPickerOpen(true)}>Upload background</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-tertiary">
              Drag each label onto its blank line, then save. This is exactly where the recipient
              name, course, and date will print on every certificate using this design.
            </p>
            <div
              ref={containerRef}
              className="relative w-full touch-none select-none overflow-hidden rounded-md border border-border"
            >
              {background?.url ? (
                <img src={background.url} alt="" className="block w-full" draggable={false} />
              ) : (
                <div className="flex aspect-video items-center justify-center text-xs text-text-tertiary">
                  Loading preview...
                </div>
              )}
              {(Object.keys(layout) as (keyof CertificateOverlayLayout)[]).map((field) => (
                <button
                  key={field}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragging(field);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-accent bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent-soft-fg shadow-(--shadow-token-sm)"
                  style={{ left: `${layout[field].x}%`, top: `${layout[field].y}%` }}
                >
                  {FIELD_LABELS[field]}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                Replace background
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => removeBackground.mutate()}>
                Remove background
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {current.backgroundAssetId && (
            <Button loading={savePositions.isPending} onClick={() => savePositions.mutate()}>
              Save positions
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
