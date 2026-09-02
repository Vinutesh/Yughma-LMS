"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage(
  props: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>,
) {
  return <AvatarPrimitive.Image className="aspect-square size-full" {...props} />;
}

export function AvatarFallback({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center text-xs font-semibold text-accent-soft-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Derives up-to-2-char initials from a display name, e.g. "Priya Sharma" → "PS". */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
