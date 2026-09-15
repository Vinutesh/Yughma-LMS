import { Lock } from "lucide-react";

/** Shown when the signed-in user lacks the permission a screen requires —
 * distinct from `ComingSoon` (an unbuilt screen), since "you don't have
 * access" and "this doesn't exist yet" are different facts and were
 * previously conflated by reusing `ComingSoon` for both. */
export function AccessDenied({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-alt">
        <Lock className="size-5 text-text-tertiary" aria-hidden />
      </div>
      <h1 className="font-display text-lg font-bold text-text-primary">{title}</h1>
      <p className="max-w-sm text-sm text-text-tertiary">
        You don&apos;t have permission to view this. Contact your org admin if you think this is
        wrong.
      </p>
    </div>
  );
}
