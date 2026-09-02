import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <h1 className="text-lg font-semibold text-text-primary">Reset your password</h1>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-text-tertiary">
          Designed in LMS/docs/modules/01-authentication/04-wireframes.md — not built yet in this
          milestone.
        </p>
        <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
          Back to login
        </Link>
      </CardContent>
    </Card>
  );
}
