"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const Menu = DropdownMenu.Root;

export function MenuTrigger({ label = "Actions" }: { label?: string }) {
  return (
    <DropdownMenu.Trigger
      aria-label={label}
      className="rounded-md p-1 text-text-tertiary hover:bg-surface-alt hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <MoreHorizontal className="size-4" />
    </DropdownMenu.Trigger>
  );
}

export function MenuContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        className={cn(
          "motion-menu z-50 min-w-40 rounded-lg border border-border bg-surface p-1.5 shadow-(--shadow-token-md)",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  destructive,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { destructive?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "cursor-pointer rounded-md px-2.5 py-1.5 text-sm outline-none",
        destructive
          ? "text-danger hover:bg-danger-bg"
          : "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}
