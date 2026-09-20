"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/state/sessionStore";

/**
 * A chrome-free route group — no Sidebar, no TopBar, nothing rendered but
 * the page's own content. Currently used only by the SCORM "play" pages,
 * per the client's ask that a SCORM package have nothing else on screen to
 * click. This is the actual ceiling of what a website can enforce: real
 * tab-switching, alt-tabbing, or clicking outside the browser window are
 * never something a page can prevent, but removing every other on-page
 * element (and auto-entering real fullscreen, see `useAutoFullscreen`)
 * closes the gap as far as it goes.
 */
export default function FocusLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
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

  return <>{children}</>;
}
