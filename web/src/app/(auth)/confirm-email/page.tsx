"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

function ConfirmEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);

  function handleConfirm() {
    if (!token) return;
    setLoading(true);
    const callbackURL = window.location.origin + "/verified";
    window.location.href = `${BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackURL)}`;
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="display text-3xl">Invalid link</h1>
        <p className="text-[color:var(--muted)]">
          This verification link is missing its token. Try clicking the link in your email again, or request a new one from sign-in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-center">
      <div className="flex justify-center">
        <div className="rounded-full p-5" style={{ background: "rgba(184,133,74,0.12)" }}>
          <Mail className="h-10 w-10" style={{ color: "#b8854a" }} />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="display text-4xl">Confirm your email</h1>
        <p className="text-[color:var(--muted)]">
          Click the button below to verify your address and activate your account.
        </p>
      </div>

      <Button
        size="lg"
        className="rounded-full px-8"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying…
          </>
        ) : (
          "Verify my account →"
        )}
      </Button>

      <p className="text-xs text-[color:var(--muted)]">
        This link expires in 24 hours.
      </p>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailInner />
    </Suspense>
  );
}
