"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { SidebarNav } from "@/components/shell/Sidebar";

/**
 * The small-screen counterpart to the desktop `Sidebar` rail — a full-height
 * overlay that slides in from the left instead of a permanent column, since
 * a fixed 256px rail sitting alongside content is what actually made the
 * app unusable on a phone (barely any width left for the page itself).
 * Built on the same Radix Dialog primitive `Drawer`/`Dialog` already use
 * elsewhere, so focus-trap/Escape/scroll-lock/overlay all come for free
 * rather than being hand-rolled again here.
 */
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto border-r border-border bg-surface-alt p-3 shadow-(--shadow-token-lg) md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <div className="mb-1 flex justify-end">
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="rounded-md p-1.5 text-text-tertiary hover:bg-border/40 hover:text-text-primary"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
