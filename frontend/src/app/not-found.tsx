import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <div className="flex items-center gap-2">
        <Image src="/mark-64.png" alt="" width={24} height={24} className="rounded-md" />
        <span className="text-sm font-semibold text-text-primary">Yughma LMS</span>
      </div>
      <h1 className="text-5xl font-bold text-text-primary">404</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        We couldn&apos;t find the page you&apos;re looking for. It may have moved, or the link
        might be out of date.
      </p>
      <Button asChild size="lg" className="mt-2">
        <Link href="/login">Back to Yughma LMS</Link>
      </Button>
    </div>
  );
}
