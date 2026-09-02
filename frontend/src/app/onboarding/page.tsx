"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionStore } from "@/state/sessionStore";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

function OnboardingInner() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !session) router.replace("/login");
  }, [mounted, session, router]);

  if (!mounted || !session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas text-sm text-text-tertiary">
        Loading...
      </div>
    );
  }

  const stepParam = Number(searchParams.get("step") ?? "1");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <OnboardingWizard initialStep={Number.isFinite(stepParam) ? stepParam : 1} />
    </div>
  );
}

// Wraps the useSearchParams() consumer per Next.js's requirement that it
// sit under a Suspense boundary.
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
