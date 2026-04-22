"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't send reset email");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="display text-4xl">Check your inbox</h1>
        <p className="text-[color:var(--muted)]">
          We sent a reset link to <strong>{email}</strong>. The link expires in
          1 hour.
        </p>
        <Link
          href="/sign-in"
          className="inline-block text-sm underline text-[color:var(--ink)]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Reset your password</h1>
        <p className="text-[color:var(--muted)]">
          We&apos;ll send a link to your email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--muted)]">
        <Link href="/sign-in" className="underline text-[color:var(--ink)]">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
