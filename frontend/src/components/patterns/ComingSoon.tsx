import { Construction } from "lucide-react";

/** Placeholder for nav destinations/screens not yet built — used so every
 * link in the shell goes somewhere real instead of 404ing. For "you don't
 * have permission" instead, use `AccessDenied` — a different fact deserves
 * different copy, not this component reused for both. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <Construction className="size-8 text-text-tertiary" aria-hidden />
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <p className="max-w-sm text-sm text-text-tertiary">
        This feature isn&apos;t available yet — it&apos;s on the roadmap.
      </p>
    </div>
  );
}
