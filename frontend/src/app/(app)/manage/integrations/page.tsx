"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/state/sessionStore";
import * as integrationsApi from "@/lib/api/resources/integrations";
import type { IntegrationRow } from "@/lib/api/resources/integrations";
import type { IntegrationKind } from "@/types/domain";
import { WebhooksTab } from "@/components/integrations/WebhooksTab";
import { ApiKeysTab } from "@/components/integrations/ApiKeysTab";

export default function IntegrationsPage() {
  const canManage = usePermission("settings", "manage");
  if (!canManage) return <ComingSoon title="Integrations" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Integrations</h1>
      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
        </TabsList>
        <TabsContent value="directory">
          <DirectoryTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="apikeys">
          <ApiKeysTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DirectoryTab() {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<IntegrationRow | null>(null);
  const [configuring, setConfiguring] = useState<IntegrationRow | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations", org?.id],
    queryFn: () => integrationsApi.listIntegrations(),
    enabled: !!org,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["integrations"] });

  const connect = useMutation({
    mutationFn: (kind: IntegrationKind) => integrationsApi.connectIntegration(kind),
    onSuccess: () => {
      invalidate();
      setConfirming(null);
    },
  });

  const disconnect = useMutation({
    mutationFn: (kind: IntegrationKind) => integrationsApi.disconnectIntegration(kind),
    onSuccess: () => {
      invalidate();
      setConfiguring(null);
    },
  });

  if (configuring) {
    return (
      <ConfigPanel
        integration={configuring}
        onBack={() => setConfiguring(null)}
        onDisconnect={() => disconnect.mutate(configuring.kind)}
        disconnecting={disconnect.isPending}
      />
    );
  }

  if (isLoading) return <p className="text-sm text-text-tertiary">Loading integrations...</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.kind} className="flex flex-col gap-2 p-4">
            <p className="text-sm font-semibold text-text-primary">{integration.name}</p>
            <p className="text-xs text-text-tertiary">{integration.description}</p>
            {integration.connected ? (
              <>
                <Badge variant="success" className="self-start">
                  Connected
                </Badge>
                <Button size="sm" variant="secondary" onClick={() => setConfiguring(integration)}>
                  Configure
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirming(integration)}>
                Connect
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {confirming?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            You&apos;ll be redirected to {confirming?.name} to authorize Yughma LMS.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              loading={connect.isPending}
              onClick={() => confirming && connect.mutate(confirming.kind)}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfigPanel({
  integration,
  onBack,
  onDisconnect,
  disconnecting,
}: {
  integration: IntegrationRow;
  onBack: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(integration.config.channel ?? "");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      integrationsApi.updateIntegrationConfig(integration.kind, { channel: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm font-medium text-accent hover:underline">
        ← Integrations
      </button>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{integration.name}</h2>
          <Badge variant="success">Connected</Badge>
        </div>
        <Button size="sm" variant="destructive" loading={disconnecting} onClick={onDisconnect}>
          Disconnect
        </Button>
      </div>
      <Card className="flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-text-primary">Notify this channel on course completions</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#learning-wins"
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      </Card>
    </div>
  );
}
