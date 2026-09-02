"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/state/sessionStore";
import { AppShell } from "@/components/shell/AppShell";

const CHANGE_PASSWORD_PATH = "/settings/password";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((s) => s.session);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    // A temp-password account (every account a platform admin creates) must
    // change it before touching anything else — see `settings/password`'s
    // own doc comment for why this can't just be a normal, skippable page.
    if (session.user.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
      router.replace(CHANGE_PASSWORD_PATH);
    }
  }, [mounted, session, pathname, router]);

  if (!mounted || !session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas text-sm text-text-tertiary">
        Loading...
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
