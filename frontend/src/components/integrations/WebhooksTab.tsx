"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import * as integrationsApi from "@/lib/api/resources/integrations";
import { ApiError } from "@/lib/api/errors";
import type { WebhookEvent } from "@/types/domain";

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "course.published": "Course published",
  "certificate.issued": "Certificate issued",
  "enrollment.completed": "Enrollment completed",
};
const EVENTS = Object.keys(EVENT_LABELS) as WebhookEvent[];

export function WebhooksTab() {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", org?.id],
    queryFn: () => integrationsApi.listWebhooks(),
    enabled: !!org,
  });

  const remove = useMutation({
    mutationFn: (id: string) => integrationsApi.deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-sm text-text-tertiary">Loading webhooks...</p>
      ) : webhooks.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No webhooks yet</p>
        </Card>
      ) : (
        webhooks.map((webhook) => (
          <Card key={webhook.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{webhook.url}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {webhook.events.map((e) => (
                    <Badge key={e} variant="neutral">
                      {EVENT_LABELS[e]}
                    </Badge>
                  ))}
                </div>
              </div>
              <Menu>
                <MenuTrigger label={`Actions for ${webhook.url}`} />
                <MenuContent>
                  <MenuItem destructive onSelect={() => remove.mutate(webhook.id)}>
                    Delete
                  </MenuItem>
                </MenuContent>
              </Menu>
            </div>
            {webhook.deliveries.length > 0 && (
              <div className="border-t border-border pt-2 text-xs text-text-tertiary">
                Last delivery: {EVENT_LABELS[webhook.deliveries[0].event]} —{" "}
                {new Date(webhook.deliveries[0].at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                — {webhook.deliveries[0].statusCode}
              </div>
            )}
          </Card>
        ))
      )}
      <div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add webhook
        </Button>
      </div>

      <AddWebhookDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(secret) => setCreatedSecret(secret)}
      />

      <Dialog open={!!createdSecret} onOpenChange={(o) => !o && setCreatedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook created</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Signing secret (copy it now — it won&apos;t be shown again):
          </p>
          <code className="block rounded-md bg-surface-alt p-2.5 text-xs">{createdSecret}</code>
          <DialogFooter>
            <Button onClick={() => setCreatedSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddWebhookDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (secret: string) => void;
}) {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => integrationsApi.createWebhook({ url, events }),
    onSuccess: (webhook) => {
      setError(null);
      setUrl("");
      setEvents([]);
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      onOpenChange(false);
      onCreated(webhook.secret);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add webhook</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="webhook-url" className="text-xs font-medium text-text-secondary">
              URL
            </label>
            <Input
              id="webhook-url"
              placeholder="https://hooks.acme.com/lms"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Events</span>
            {EVENTS.map((e) => (
              <label key={e} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={events.includes(e)}
                  onChange={(ev) =>
                    setEvents((prev) => (ev.target.checked ? [...prev, e] : prev.filter((x) => x !== e)))
                  }
                  className="size-4 accent-accent"
                />
                {EVENT_LABELS[e]}
              </label>
            ))}
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!url.trim() || events.length === 0}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
