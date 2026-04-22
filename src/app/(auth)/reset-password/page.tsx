"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't reset password");
      return;
    }
    toast.success("Password reset. Please sign in.");
    router.replace("/sign-in");
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="display text-4xl">Invalid link</h1>
        <p className="text-[color:var(--muted)]">
          This reset link is missing a token. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm underline text-[color:var(--ink)]"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Choose a new password</h1>
        <p className="text-[color:var(--muted)]">At least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
