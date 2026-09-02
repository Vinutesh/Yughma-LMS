import { Construction } from "lucide-react";

/** Placeholder for nav destinations/screens not yet built in this milestone —
 * used so every link in the shell goes somewhere real instead of 404ing. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <Construction className="size-8 text-text-tertiary" aria-hidden />
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <p className="max-w-sm text-sm text-text-tertiary">
        This screen is designed (see the wireframes in LMS/docs/modules/) but not built yet in this
        milestone.
      </p>
    </div>
  );
}
