import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Standard "nothing here yet" treatment — an icon in a soft accent-tinted
 * circle plus title/description, replacing the plain text-only blocks that
 * used to appear across the catalog/library/certificates pages. One
 * component so every empty list in the app reads as the same considered
 * state rather than a dozen slightly different ad-hoc ones.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col items-center gap-3 p-10 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="size-5 text-accent-soft-fg" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description && <p className="max-w-xs text-xs text-text-tertiary">{description}</p>}
      </div>
      {action}
    </Card>
  );
}
