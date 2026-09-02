"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useSessionStore } from "@/state/sessionStore";
import { useOnboardingStore } from "@/state/onboardingStore";
import * as orgsApi from "@/lib/api/resources/organizations";
import * as billingApi from "@/lib/api/resources/billing";
import * as scormApi from "@/lib/api/resources/scorm";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsPage() {
  const canManage = usePermission("settings", "view");
  if (!canManage) return <ComingSoon title="Settings" />;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Settings</h1>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="depts">Departments &amp; Teams</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="lrs">LRS Connection</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="flex flex-col gap-4">
            <PlanRow />
            <GeneralTab />
          </div>
        </TabsContent>
        <TabsContent value="depts">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
        <TabsContent value="lrs">
          <LrsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Trial/plan status is always visible here during a trial, per the Trial &
 * Plan module — the quiet, non-nagging counterpart to the shell banner. */
function PlanRow() {
  const org = useSessionStore((s) => s.session?.org);
  const canChoosePlan = usePermission("settings", "manage");

  const { data: planState } = useQuery({
    queryKey: ["planState", org?.id],
    queryFn: () => billingApi.getPlanState(),
    enabled: !!org,
  });

  if (!planState) return null;

  return (
    <Card className="flex max-w-md items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium text-text-primary">
          Plan:{" "}
          {planState.planName ??
            (planState.expired ? "Trial ended" : planState.onTrial ? "Free trial" : "None")}
        </p>
        {planState.onTrial && planState.daysLeft !== null && (
          <p className="text-xs text-text-tertiary">
            {planState.daysLeft} {planState.daysLeft === 1 ? "day" : "days"} left
            {planState.planName && " — new plan starts when the trial ends"}
          </p>
        )}
      </div>
      {canChoosePlan && (
        <Button size="sm" variant="secondary" asChild>
          <Link href="/manage/plan">{planState.plan ? "Change plan" : "Choose a plan"}</Link>
        </Button>
      )}
    </Card>
  );
}

function GeneralTab() {
  const org = useSessionStore((s) => s.session?.org);
  const patchSessionOrg = useSessionStore((s) => s.patchSessionOrg);
  const setOrgBasicsDone = useOnboardingStore((s) => s.setOrgBasicsDone);

  const [name, setName] = useState(org?.name ?? "");
  const [industry, setIndustry] = useState(org?.industry ?? "");
  const [size, setSize] = useState(org?.size ?? "");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => orgsApi.updateOrgGeneral({ name, industry, size }),
    onSuccess: () => {
      patchSessionOrg({ name, industry, size });
      setOrgBasicsDone(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!org) return null;

  return (
    <Card className="flex max-w-md flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-name">Organization name</Label>
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-industry">Industry</Label>
          <select
            id="s-industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          >
            <option value="">Select...</option>
            <option>Technology</option>
            <option>Financial Services</option>
            <option>Healthcare</option>
            <option>Retail</option>
            <option>Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-size">Organization size</Label>
          <select
            id="s-size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          >
            <option value="">Select...</option>
            <option>1–50</option>
            <option>51–200</option>
            <option>201–500</option>
            <option>500+</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
          Save changes
        </Button>
        {saved && <span className="text-xs font-medium text-success">Saved</span>}
      </div>
    </Card>
  );
}

function DepartmentsTab() {
  const org = useSessionStore((s) => s.session?.org);
  const qc = useQueryClient();
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [addTeamFor, setAddTeamFor] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments", org?.id],
    queryFn: () => orgsApi.listDepartments(),
    enabled: !!org,
  });

  const createDept = useMutation({
    mutationFn: (name: string) => orgsApi.createDepartment(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments", org?.id] });
      setCreateDeptOpen(false);
      setDeptName("");
    },
  });

  const createTeam = useMutation({
    mutationFn: ({ deptId, name }: { deptId: string; name: string }) =>
      orgsApi.createTeam(deptId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments", org?.id] });
      setAddTeamFor(null);
      setTeamName("");
    },
  });

  const archiveDept = useMutation({
    mutationFn: (id: string) => orgsApi.archiveDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", org?.id] }),
  });
  const archiveTeam = useMutation({
    mutationFn: (id: string) => orgsApi.archiveTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", org?.id] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateDeptOpen(true)}>
          + Create department
        </Button>
      </div>

      {departments?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No departments yet</p>
          <p className="text-xs text-text-tertiary">
            Group your people to scope reporting and enrollment.
          </p>
        </Card>
      )}

      {departments?.map((d) => (
        <Card key={d.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">{d.name}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-tertiary">{d.memberCount} members</span>
              <button
                className="font-semibold text-accent hover:underline"
                onClick={() => setAddTeamFor(d.id)}
              >
                + Add team
              </button>
              <button
                className="font-semibold text-text-tertiary hover:text-danger"
                onClick={() => archiveDept.mutate(d.id)}
              >
                Archive
              </button>
            </div>
          </div>
          {d.teams.length > 0 && (
            <div className="ml-4 flex flex-col gap-1 border-l border-border pl-3">
              {d.teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t.name}</span>
                  <button
                    className="text-xs font-semibold text-text-tertiary hover:text-danger"
                    onClick={() => archiveTeam.mutate(t.id)}
                  >
                    Archive
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      <Dialog open={createDeptOpen} onOpenChange={setCreateDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create department</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-name">Name</Label>
            <Input id="dept-name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateDeptOpen(false)}>
              Cancel
            </Button>
            <Button loading={createDept.isPending} onClick={() => createDept.mutate(deptName)}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addTeamFor} onOpenChange={(open) => !open && setAddTeamFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name">Name</Label>
            <Input id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddTeamFor(null)}>
              Cancel
            </Button>
            <Button
              loading={createTeam.isPending}
              onClick={() => addTeamFor && createTeam.mutate({ deptId: addTeamFor, name: teamName })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillingTab() {
  const session = useSessionStore((s) => s.session)!;
  const canManage = usePermission("settings", "manage");
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: billing } = useQuery({
    queryKey: ["billingState", session.org.id],
    queryFn: () => billingApi.getBillingState(),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", session.org.id],
    queryFn: () => billingApi.listInvoices(),
  });

  const cancel = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billingState"] });
      setCancelOpen(false);
    },
  });

  if (!billing) return null;

  if (!billing.plan) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-text-primary">No active subscription</p>
        <p className="text-xs text-text-tertiary">
          Choose a plan from the General tab to see billing details here.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">{billing.planName} plan</p>
          <span
            className={
              "text-xs font-semibold " +
              (billing.subscriptionStatus === "past_due" ? "text-danger" : "text-success")
            }
          >
            {billing.cancelAtPeriodEnd
              ? "Canceling at period end"
              : billing.subscriptionStatus === "past_due"
                ? "Past due"
                : "Active"}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Seats: {billing.seatsUsed} of {billing.seatLimit ?? "∞"} used
        </p>
        {billing.nextInvoiceAt && (
          <p className="text-xs text-text-tertiary">
            Next invoice: {new Date(billing.nextInvoiceAt).toLocaleDateString()}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-text-secondary">
            {billing.paymentMethod
              ? `${billing.paymentMethod.brand} •••• ${billing.paymentMethod.last4}`
              : "No payment method on file"}
          </span>
          {canManage && (
            <Button size="sm" variant="secondary" onClick={() => setPaymentOpen(true)}>
              Update
            </Button>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button size="sm" variant="secondary" onClick={() => setSeatsOpen(true)}>
              Request more seats
            </Button>
            {!billing.cancelAtPeriodEnd && (
              <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel subscription
              </Button>
            )}
          </div>
        )}
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Invoice history
        </p>
        {invoices.length === 0 ? (
          <p className="text-sm text-text-tertiary">No invoices yet.</p>
        ) : (
          <Card className="divide-y divide-border">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-text-secondary">
                  {new Date(inv.issuedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="font-medium text-text-primary">
                  ${(inv.amountCents / 100).toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-success">
                  {inv.status === "paid" ? "Paid" : "Open"}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <PaymentMethodDialog open={paymentOpen} onOpenChange={setPaymentOpen} />
      <SeatsDialog
        open={seatsOpen}
        onOpenChange={setSeatsOpen}
        seatsUsed={billing.seatsUsed}
        seatLimit={billing.seatLimit}
      />
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your subscription?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Your plan stays active through the end of this billing period
            {billing.nextInvoiceAt && ` (${new Date(billing.nextInvoiceAt).toLocaleDateString()})`},
            then your workspace reverts to no plan.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep plan
            </Button>
            <Button variant="destructive" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              Cancel plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentMethodDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => billingApi.updatePaymentMethod({ brand, last4 }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["billingState"] });
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update payment method</DialogTitle>
        </DialogHeader>
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-brand">Card brand</Label>
            <select
              id="card-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Amex</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-last4">Last 4 digits</Label>
            <Input
              id="card-last4"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        <p className="text-xs text-text-tertiary">
          Mock only — a real integration collects this via Stripe Elements, never a raw card number
          touching our servers.
        </p>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={last4.length !== 4} loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeatsDialog({
  open,
  onOpenChange,
  seatsUsed,
  seatLimit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seatsUsed: number;
  seatLimit: number | null;
}) {
  const qc = useQueryClient();
  const [additional, setAdditional] = useState("50");
  const [sent, setSent] = useState(false);

  const request = useMutation({
    mutationFn: () => billingApi.requestSeats(Number(additional)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billingState"] });
      setSent(true);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSent(false);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request more seats</DialogTitle>
        </DialogHeader>
        {sent ? (
          <>
            <p className="text-sm text-text-secondary">
              We&apos;ll follow up to confirm pricing for {additional} additional seats.
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              Currently: {seatsUsed} of {seatLimit ?? "∞"} seats used
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seats-additional">Additional seats needed</Label>
              <Input
                id="seats-additional"
                type="number"
                min={1}
                value={additional}
                onChange={(e) => setAdditional(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button loading={request.isPending} onClick={() => request.mutate()}>
                Send request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BrandingTab() {
  const org = useSessionStore((s) => s.session?.org);
  const canManage = usePermission("settings", "manage");
  const qc = useQueryClient();
  const [accentColor, setAccentColor] = useState(org?.accentColor ?? "#4A4AC4");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => orgsApi.updateOrgBranding({ accentColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!org) return null;

  return (
    <Card className="flex max-w-md flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-text-tertiary">
            {org.logoUrl ? "Set" : "None"}
          </div>
          <Button size="sm" variant="secondary" disabled={!canManage} title="Uploads land with the real file backend">
            Upload
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accent-color">Accent color</Label>
        <div className="flex items-center gap-2">
          <input
            id="accent-color"
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            disabled={!canManage}
            className="size-9 cursor-pointer rounded border border-border"
          />
          <span className="text-sm text-text-secondary">{accentColor}</span>
        </div>
      </div>
      <div>
        <Label>Preview</Label>
        <div
          className="mt-1.5 flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          <span className="size-4 rounded-[4px] bg-white/30" aria-hidden />
          {org.name}
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-3">
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      )}
    </Card>
  );
}

function SecurityTab() {
  const session = useSessionStore((s) => s.session);
  const org = session?.org;
  const canManage = usePermission("settings", "manage");
  const qc = useQueryClient();
  const [timeout_, setTimeout_] = useState(String(org?.sessionTimeoutHours ?? 8));
  const [requireSso, setRequireSso] = useState(org?.requireSso ?? false);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => orgsApi.updateOrgSecurity({ sessionTimeoutHours: Number(timeout_), requireSso }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!org) return null;

  return (
    <Card className="flex max-w-md flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-timeout">Session timeout</Label>
        <select
          id="session-timeout"
          value={timeout_}
          onChange={(e) => setTimeout_(e.target.value)}
          disabled={!canManage}
          className="h-9 w-40 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
        >
          <option value="1">1 hour</option>
          <option value="8">8 hours</option>
          <option value="24">24 hours</option>
          <option value="168">7 days</option>
        </select>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireSso}
          onChange={(e) => setRequireSso(e.target.checked)}
          disabled={!canManage}
          className="mt-0.5 size-4 accent-accent"
        />
        <span>
          <span className="text-text-secondary">Require SSO for all logins</span>
          <span className="block text-xs text-warning">
            Inert until an SSO integration is connected — see Integrations.
          </span>
        </span>
      </label>
      {canManage && (
        <div className="flex items-center gap-3">
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      )}
    </Card>
  );
}

function DataTab() {
  const org = useSessionStore((s) => s.session?.org);
  const canManage = usePermission("settings", "manage");
  const [exportRequested, setExportRequested] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: inventory } = useQuery({
    queryKey: ["orgInventory", org?.id],
    queryFn: () => orgsApi.getOrgInventory(),
    enabled: !!org,
  });

  if (!org) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-text-primary">Export all organization data</p>
          <p className="text-xs text-text-tertiary">
            Everything — users, courses, certificates, audit log.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!canManage || exportRequested}
          onClick={() => setExportRequested(true)}
        >
          {exportRequested ? "Requested" : "Request export"}
        </Button>
      </Card>

      {canManage && (
        <Card className="flex items-center justify-between gap-4 border-danger p-5">
          <div>
            <p className="text-sm font-semibold text-danger">Delete this organization</p>
            {inventory && (
              <p className="text-xs text-text-tertiary">
                Permanently removes {inventory.userCount} users, {inventory.courseCount} courses,{" "}
                {inventory.certificateCount} certificates. This cannot be undone.
              </p>
            )}
          </div>
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete organization
          </Button>
        </Card>
      )}

      <DeleteOrgDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        orgName={org.name}
        inventory={inventory}
      />
    </div>
  );
}

function DeleteOrgDialog({
  open,
  onOpenChange,
  orgName,
  inventory,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgName: string;
  inventory?: { userCount: number; courseCount: number; certificateCount: number };
}) {
  const [confirmText, setConfirmText] = useState("");
  const [blocked, setBlocked] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setConfirmText("");
          setBlocked(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {orgName}?</DialogTitle>
        </DialogHeader>
        {blocked ? (
          <>
            <p className="text-sm text-text-secondary">
              Org deletion isn&apos;t wired to anything real yet — there&apos;s no backend to actually
              delete from. This confirms the flow (real inventory, typed-name confirmation) is correct
              for when there is one; it deliberately doesn&apos;t touch this demo&apos;s data.
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Got it</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-sm text-text-secondary">
              <p>This permanently removes:</p>
              <ul className="list-disc pl-5">
                <li>{inventory?.userCount ?? 0} users</li>
                <li>{inventory?.courseCount ?? 0} courses</li>
                <li>{inventory?.certificateCount ?? 0} certificates</li>
              </ul>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-org-name">Type &quot;{orgName}&quot; to confirm</Label>
              <Input
                id="confirm-org-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== orgName}
                onClick={() => setBlocked(true)}
              >
                Delete forever
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LrsTab() {
  const org = useSessionStore((s) => s.session?.org);
  const canManage = usePermission("settings", "manage");
  const qc = useQueryClient();
  const [endpointUrl, setEndpointUrl] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: connection } = useQuery({
    queryKey: ["lrsConnection", org?.id],
    queryFn: () => scormApi.getLrsConnection(),
    enabled: !!org,
  });

  const save = useMutation({
    mutationFn: () => scormApi.saveLrsConnection({ endpointUrl, authKey }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["lrsConnection"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  if (!org || !connection) return null;

  return (
    <Card className="flex max-w-md flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lrs-endpoint">Endpoint URL</Label>
        <Input
          id="lrs-endpoint"
          placeholder="https://lrs.example.com/xapi"
          defaultValue={connection.endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          disabled={!canManage}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lrs-key">Auth key</Label>
        <Input
          id="lrs-key"
          type="password"
          defaultValue={connection.authKey}
          onChange={(e) => setAuthKey(e.target.value)}
          disabled={!canManage}
        />
      </div>
      <p className="text-xs text-warning">Not connected — this is stored only, no live sync yet.</p>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      {canManage && (
        <div className="flex items-center gap-3">
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
          {saved && <span className="text-xs font-medium text-success">Saved</span>}
        </div>
      )}
    </Card>
  );
}
