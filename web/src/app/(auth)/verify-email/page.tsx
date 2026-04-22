"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) {
      toast.error("No email on record. Sign up again to trigger verification.");
      return;
    }
    setResending(true);
    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/app",
    });
    setResending(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't resend");
      return;
    }
    toast.success("Verification email sent.");
  }

  return (
    <div className="space-y-6 text-center">
      <h1 className="display text-4xl">Check your inbox</h1>
      <p className="text-[color:var(--muted)]">
        {email ? (
          <>
            We sent a verification link to <strong>{email}</strong>. Click it to
            complete signup.
          </>
        ) : (
          <>
            We sent you a verification email. Click the link inside to complete
            signup.
          </>
        )}
      </p>

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={resending || !email}
        >
          {resending ? "Sending…" : "Resend"}
        </Button>
        <Link href="/app" className="text-sm underline text-[color:var(--ink)]">
          Continue anyway
        </Link>
      </div>

      <p className="text-xs text-[color:var(--muted)]">
        Didn&apos;t get it? Check spam, or come back and retry from{" "}
        <Link href="/sign-in" className="underline">
          sign in
        </Link>
        .
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
