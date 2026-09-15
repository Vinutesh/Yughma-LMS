import type { Invoice, PaymentMethod, PlanId } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";
import { ApiError } from "@/lib/api/errors";

/**
 * Real backend-backed billing resource client. Every mutation now targets
 * "my org" via the caller's session server-side — the `orgId` arguments the
 * mock signatures took are dropped, since `billing.ts` router's mutations
 * all operate on `ctx.session.orgId`, never an id argument (same rule as
 * `organizations.ts`'s doc comment). Still no real payment processor behind
 * this — `updatePaymentMethod` just records brand/last4 as before.
 */



export interface Plan {
  id: PlanId;
  name: string;
  seats: string;
  /** Numeric seat cap this plan grants — Enterprise has none (unlimited). */
  seatLimit?: number;
  features: string[];
  /** Enterprise routes to sales rather than being self-serve selectable. */
  contactSales?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    seats: "Up to 50 users",
    seatLimit: 50,
    features: ["Core LMS", "Courses & lessons", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    seats: "Up to 500 users",
    seatLimit: 500,
    features: ["Everything in Starter", "Reports & API access", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    seats: "Unlimited",
    features: ["Everything in Growth", "SSO & SCIM", "Dedicated CSM"],
    contactSales: true,
  },
];

export interface PlanState {
  plan: PlanId | null;
  planName: string | null;
  trialEndsAt: string | null;
  /** Negative once the trial is past. Null when there's no trial at all. */
  daysLeft: number | null;
  onTrial: boolean;
  /** Trial is over and no plan was chosen — the hard stop from Journey 3. */
  expired: boolean;
  /** Journey 1: stay quiet until the last week. */
  endingSoon: boolean;
}

/** Whole-day countdown, so "1 day left" doesn't flicker to 0 mid-afternoon. */
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

async function fetchState() {
  try {
    const state = await trpcClient.billing.getState.query();
    return toDateStrings(nullsToUndefined(state), ["trialEndsAt", "planChosenAt", "nextInvoiceAt"]);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getPlanState(): Promise<PlanState> {
  const state = await fetchState();
  const plan = state.plan as PlanId | undefined ?? null;
  const trialEndsAt = state.trialEndsAt ?? null;
  const daysLeft = trialEndsAt ? daysUntil(trialEndsAt) : null;
  const trialOver = daysLeft !== null && daysLeft <= 0;

  return {
    plan,
    planName: plan ? (PLANS.find((p) => p.id === plan)?.name ?? null) : null,
    trialEndsAt,
    daysLeft,
    onTrial: !plan && !!trialEndsAt && !trialOver,
    expired: !plan && trialOver,
    endingSoon: !plan && daysLeft !== null && daysLeft > 0 && daysLeft <= 7,
  };
}

/**
 * Records the choice only — no card is charged in this pass (ROADMAP Phase 1).
 * The trial keeps running; the plan takes effect when it ends.
 */
export async function choosePlan(planId: PlanId): Promise<void> {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new ApiError("validation", "Unknown plan.");
  if (plan.contactSales) {
    throw new ApiError("validation", `${plan.name} is set up with our sales team, not self-serve.`);
  }
  try {
    await trpcClient.billing.choosePlan.mutate({ planId, seatLimit: plan.seatLimit });
  } catch (err) {
    throw toApiError(err);
  }
}

export interface BillingState {
  plan: PlanId | null;
  planName: string | null;
  seatsUsed: number;
  seatLimit: number | null;
  subscriptionStatus: "active" | "past_due" | "canceled" | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: PaymentMethod | null;
  nextInvoiceAt: string | null;
}

export async function getBillingState(): Promise<BillingState> {
  const state = await fetchState();
  const plan = state.plan as PlanId | undefined ?? null;
  const paymentMethod =
    state.paymentMethodBrand && state.paymentMethodLast4
      ? { brand: state.paymentMethodBrand as string, last4: state.paymentMethodLast4 as string }
      : null;

  return {
    plan,
    planName: plan ? (PLANS.find((p) => p.id === plan)?.name ?? null) : null,
    seatsUsed: state.seatsUsed as number,
    seatLimit: (state.seatLimit as number | undefined) ?? null,
    subscriptionStatus: (state.subscriptionStatus as BillingState["subscriptionStatus"]) ?? null,
    cancelAtPeriodEnd: (state.cancelAtPeriodEnd as boolean) ?? false,
    paymentMethod,
    nextInvoiceAt: (state.nextInvoiceAt as string | undefined) ?? null,
  };
}

export async function listInvoices(): Promise<Invoice[]> {
  try {
    const invoices = await trpcClient.billing.listInvoices.query();
    return invoices.map((i) => toDateStrings(nullsToUndefined(i), ["issuedAt"]) as unknown as Invoice);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updatePaymentMethod(paymentMethod: PaymentMethod): Promise<void> {
  if (!/^\d{4}$/.test(paymentMethod.last4)) {
    throw new ApiError("validation", "Enter the last 4 digits of the card.");
  }
  try {
    await trpcClient.billing.updatePaymentMethod.mutate(paymentMethod);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function requestSeats(additionalSeats: number): Promise<void> {
  if (additionalSeats <= 0) throw new ApiError("validation", "Enter a positive number of seats.");
  try {
    await trpcClient.billing.requestSeats.mutate({ additionalSeats });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function cancelSubscription(): Promise<void> {
  try {
    await trpcClient.billing.cancelSubscription.mutate();
  } catch (err) {
    throw toApiError(err);
  }
}
