"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSessionStore, ApiError } from "@/state/sessionStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useSessionStore((s) => s.login);
  const session = useSessionStore((s) => s.session);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (session) router.replace("/home");
  }, [session, router]);

  useEffect(() => {
    if (!retryAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [retryAt]);

  const secondsLeft = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
  const locked = !!retryAt && secondsLeft > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/home");
    } catch (err) {
      if (err instanceof ApiError && err.code === "locked_out") {
        setRetryAt(err.retryAt ?? Date.now() + 30_000);
        setError(null);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-1 flex items-center gap-2">
          <span className="size-6 rounded-md bg-accent" aria-hidden />
          <span className="text-sm font-semibold text-text-primary">Yughma LMS</span>
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Log in</h1>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs font-semibold text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!error}
              required
            />
          </div>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          {locked && (
            <p className="text-xs font-medium text-warning">
              Too many attempts. Try again in {secondsLeft}s.
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting} disabled={locked}>
            {locked ? `Try again in ${secondsLeft}s` : "Log in"}
          </Button>

          <p className="text-center text-xs text-text-tertiary">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
