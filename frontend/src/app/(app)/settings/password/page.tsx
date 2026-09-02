"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useSessionStore } from "@/state/sessionStore";
import * as authApi from "@/lib/api/resources/auth";
import { ApiError } from "@/lib/api/errors";

/**
 * Every account a platform admin creates starts with a generated temp
 * password (see `platform.ts`'s `createClientUser` / `prisma/seed.ts`) and
 * `mustChangePassword: true` — the `(app)` layout redirects here and here
 * only until it's cleared, so this page can't just be skipped like a normal
 * settings screen. Also reachable voluntarily from the profile menu any
 * time after that, for a regular password change.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const mustChangePassword = useSessionStore((s) => s.session?.user.mustChangePassword ?? false);
  const patchSessionUser = useSessionStore((s) => s.patchSessionUser);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      patchSessionUser({ mustChangePassword: false });
      setDone(true);
      setTimeout(() => router.replace(mustChangePassword ? "/home" : "/settings/password"), 1200);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    },
  });

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">
        {mustChangePassword ? "Set a new password" : "Change password"}
      </h1>
      <p className="mb-5 text-sm text-text-tertiary">
        {mustChangePassword
          ? "You're signing in with a temporary password — set your own before continuing."
          : "Enter your current password and choose a new one."}
      </p>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {tooShort && <p className="text-xs text-warning">At least 8 characters.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {mismatch && <p className="text-xs text-danger">Passwords don&apos;t match.</p>}
        </div>

        {error && (
          <p className="rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
        )}
        {done && (
          <p className="rounded-md bg-success-bg p-2.5 text-xs font-medium text-success">
            Password updated.
          </p>
        )}

        <Button
          disabled={!currentPassword || newPassword.length < 8 || mismatch}
          loading={mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mustChangePassword ? "Set password and continue" : "Update password"}
        </Button>
      </Card>
    </div>
  );
}
