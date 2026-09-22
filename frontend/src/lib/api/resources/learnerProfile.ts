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
