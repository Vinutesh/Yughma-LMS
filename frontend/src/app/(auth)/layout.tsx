import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      {/* Brand panel — the one place this app leans into the gradient
          rather than staying purely functional. Hidden below md so a
          phone screen spends its width on the actual form, not decoration. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          <Image src="/mark-64.png" alt="" width={28} height={28} className="rounded-[7px]" />
          <span className="font-display text-lg font-bold">Yughma LMS</span>
        </div>
        <div className="relative flex flex-col gap-3">
          <p className="max-w-sm font-display text-3xl font-bold leading-tight text-balance">
            Learning that actually gets finished.
          </p>
          <p className="max-w-sm text-sm text-white/70">
            Courses, paths, and certificates for teams who want training to feel like part of the
            job, not a chore bolted onto it.
          </p>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Yughma Technologies</p>
      </div>

      <div className="flex items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-100">{children}</div>
      </div>
    </div>
  );
}
