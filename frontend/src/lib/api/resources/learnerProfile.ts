import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";

/** Called from the onboarding wizard as each step completes — see
 * `learnerProfile.ts` router's own doc comment on why this upserts rather
 * than requiring a prior row. */
export async function saveOnboardingProfile(input: {
  persona?: string;
  goal?: string;
  inviteCount?: number;
}): Promise<void> {
  try {
    await trpcClient.learnerProfile.saveOnboarding.mutate(input);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface Lead {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  persona: string | null;
  goal: string | null;
  leadScore: number;
  updatedAt: string;
}

/** The one visible surface for the CRM/lead-gen capability — see the
 * router's own doc comment. */
export async function listLeads(): Promise<Lead[]> {
  try {
    const rows = await trpcClient.learnerProfile.list.query();
    return rows.map((r) => ({ ...r, updatedAt: new Date(r.updatedAt).toISOString() }));
  } catch (err) {
    throw toApiError(err);
  }
}
