"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/state/sessionStore";
import { useOnboardingStore } from "@/state/onboardingStore";
import { nameFromEmail } from "@/lib/nameFromEmail";
import * as orgsApi from "@/lib/api/resources/organizations";
import * as learnerProfileApi from "@/lib/api/resources/learnerProfile";
import * as usersApi from "@/lib/api/resources/users";

const PERSONAS = [
  "Onboard new hires",
  "Upskill my team",
  "Sell training to clients",
  "Something else",
];

const TOTAL_STEPS = 4;

export function OnboardingWizard({ initialStep = 1 }: { initialStep?: number }) {
  const router = useRouter();
  const orgName = useSessionStore((s) => s.session?.org.name ?? "");
  const setOrgBasicsDone = useOnboardingStore((s) => s.setOrgBasicsDone);
  const setPersonaDone = useOnboardingStore((s) => s.setPersonaDone);
  const setInviteCount = useOnboardingStore((s) => s.setInviteCount);

  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), TOTAL_STEPS));
  const [name, setName] = useState(orgName);
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [persona, setPersona] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every step's save is best-effort: the wizard always advances regardless
  // of whether it succeeded, since getting stuck here (e.g. because this
  // particular account wasn't granted the right role) would be worse than a
  // dropped save the person can redo later from Settings/Users. `error`
  // surfaces what happened rather than swallowing it silently.
  async function saveStep(fn: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that — you can update it later.");
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    // Per Onboarding Flow A: skipping any step exits straight to the shell,
    // not the next step — remaining steps surface later via the checklist.
    router.replace("/home");
  }

  function addEmail() {
    const v = emailDraft.trim();
    if (v && v.includes("@") && !emails.includes(v)) {
      setEmails([...emails, v]);
      setEmailDraft("");
    }
  }

  return (
    <Card className="w-120 p-8">
      <div className="mb-5 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={cn("size-2 rounded-full", n <= step ? "bg-accent" : "bg-border")}
          />
        ))}
        <span className="ml-auto font-mono text-[11px] text-text-tertiary">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold text-text-primary">
            Let&apos;s set up your organization
          </h1>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-name">Organization name</Label>
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ob-industry">Industry</Label>
              <select
                id="ob-industry"
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
              <Label htmlFor="ob-size">Organization size</Label>
              <select
                id="ob-size"
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
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <StepFooter
            onSkip={skip}
            saving={saving}
            onContinue={async () => {
              await saveStep(() =>
                orgsApi.updateOrgGeneral({
                  name: name.trim() || undefined,
                  industry: industry || undefined,
                  size: size || undefined,
                }),
              );
              setOrgBasicsDone(true);
              setStep(2);
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              What will you use Yughma for?
            </h1>
            <p className="text-sm text-text-tertiary">
              Pick what fits best — helps us tailor what you see first.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {PERSONAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPersona(p)}
                className={cn(
                  "rounded-lg border p-3.5 text-left text-sm font-semibold transition-colors",
                  persona === p
                    ? "border-accent bg-accent-soft text-accent-soft-fg"
                    : "border-border text-text-secondary hover:bg-surface-alt",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-goal">What are you hoping to achieve? (optional)</Label>
            <textarea
              id="ob-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="e.g. get our new hires certified before they start client work"
              className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <StepFooter
            onSkip={skip}
            saving={saving}
            onContinue={async () => {
              await saveStep(() =>
                learnerProfileApi.saveOnboardingProfile({ persona: persona ?? undefined, goal: goal.trim() || undefined }),
              );
              setPersonaDone(true);
              setStep(3);
            }}
          />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Invite your team</h1>
            <p className="text-sm text-text-tertiary">
              They&apos;ll join as Learners — you can change roles anytime from Users &amp;
              Roles.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
            {emails.map((e) => (
              <div
                key={e}
                className="flex items-center justify-between rounded bg-surface-alt px-2.5 py-1.5 text-sm text-text-secondary"
              >
                {e}
                <button
                  type="button"
                  onClick={() => setEmails(emails.filter((x) => x !== e))}
                  className="text-text-tertiary hover:text-danger"
                  aria-label={`Remove ${e}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              onBlur={addEmail}
              placeholder="Add another email..."
              className="rounded px-2.5 py-1.5 text-sm outline-none placeholder:text-text-tertiary"
            />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <StepFooter
            onSkip={skip}
            saving={saving}
            continueLabel="Send invites →"
            onContinue={async () => {
              await saveStep(async () => {
                if (emails.length > 0) {
                  const results = await usersApi.inviteUsers(
                    emails.map((email) => ({ name: nameFromEmail(email), email, roleId: null })),
                  );
                  const failed = results.filter((r) => r.status === "failed");
                  if (failed.length > 0) {
                    throw new Error(
                      `${failed.length} of ${emails.length} invite${emails.length === 1 ? "" : "s"} couldn't be sent — you can retry from Users & Roles.`,
                    );
                  }
                }
                await learnerProfileApi.saveOnboardingProfile({ inviteCount: emails.length });
              });
              setInviteCount(emails.length);
              setStep(4);
            }}
          />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-success-bg text-lg text-success">
            ✓
          </div>
          <h1 className="text-lg font-semibold text-text-primary">You&apos;re all set</h1>
          <p className="text-xs text-text-tertiary">
            Anything you skipped will stay handy in a checklist on your Home.
          </p>
          <Button size="lg" className="mt-1 px-8" onClick={() => router.replace("/home")}>
            Go to my Home
          </Button>
        </div>
      )}
    </Card>
  );
}

function StepFooter({
  onSkip,
  onContinue,
  continueLabel = "Continue →",
  saving = false,
}: {
  onSkip: () => void;
  onContinue: () => void;
  continueLabel?: string;
  saving?: boolean;
}) {
  return (
    <div className="mt-1 flex items-center justify-between">
      <button
        type="button"
        onClick={onSkip}
        className="text-xs font-semibold text-text-tertiary hover:text-text-secondary"
      >
        Skip for now
      </button>
      <Button onClick={onContinue} loading={saving}>{continueLabel}</Button>
    </div>
  );
}
