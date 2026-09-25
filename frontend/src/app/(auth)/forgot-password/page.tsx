"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import * as authApi from "@/lib/api/resources/auth";
import { ApiError } from "@/lib/api/errors";

/**
 * One page, two modes, switched on whether a `?token=` is present — no
 * separate route needed. Without a token: the "enter your email" request
 * form. With one (the link `requestPasswordReset` emails): the "choose a
 * new password" form. Both mutations always return success/failure the same
 * way regardless of *why* (unknown email, expired token) to avoid leaking
 * which emails have accounts or why exactly a link stopped working.
 */
export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordCard />
    </Suspense>
  );
}

function ForgotPasswordCard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <h1 className="font-display text-xl font-bold text-text-primary">
          {token ? "Choose a new password" : "Reset your password"}
        </h1>
      </CardHeader>
      <CardContent>{token ? <ResetForm token={token} /> : <RequestForm />}</CardContent>
    </Card>
  );
}

function RequestForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(email);
    } catch {
      // Deliberately swallowed — the backend already returns success either
      // way to avoid confirming which emails have accounts; a network-level
      // failure here is rare enough not to need its own message.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-text-secondary">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset the
          password. It expires in 30 minutes.
        </p>
        <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <p className="text-sm text-text-tertiary">
        Enter the email on your account and we&apos;ll send you a link to reset your password.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-email">Email</Label>
        <Input
          id="fp-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" size="lg" loading={submitting}>
        Send reset link
      </Button>
      <p className="text-center text-xs text-text-tertiary">
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}

function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPasswordWithToken(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="text-center text-sm text-text-secondary">
        Password updated. Taking you to login...
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-password">New password</Label>
        <PasswordInput
          id="fp-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!error}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-confirm">Confirm password</Label>
        <PasswordInput
          id="fp-confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          invalid={!!error}
          required
        />
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      <Button type="submit" size="lg" loading={submitting}>
        Reset password
      </Button>
    </form>
  );
}
