import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

/**
 * There is no self-serve signup anymore — every company account is created
 * by a Yughma Tech platform admin (see `platform.ts` on the backend), never
 * a public form. This route stays live (rather than 404-ing) so an old
 * bookmarked/linked "Sign up" URL lands somewhere coherent instead of
 * breaking outright.
 */
export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-1 flex items-center gap-2">
          <span className="size-6 rounded-md bg-accent" aria-hidden />
          <span className="text-sm font-semibold text-text-primary">Yughma LMS</span>
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Get in touch</h1>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-text-secondary">
            Company accounts are set up by the Yughma Tech team — reach out and we&apos;ll get your
            organization and your people access set up.
          </p>
          <p className="text-center text-xs text-text-tertiary">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
