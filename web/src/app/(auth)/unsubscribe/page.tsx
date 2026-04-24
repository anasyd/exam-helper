"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

type State = "loading" | "unsubscribed" | "resubscribed" | "error";

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const sig = searchParams.get("sig");
  const [state, setState] = useState<State>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!uid || !sig) { setState("error"); return; }
    fetch(`${BASE}/api/email/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, sig }),
    })
      .then((r) => setState(r.ok ? "unsubscribed" : "error"))
      .catch(() => setState("error"));
  }, [uid, sig]);

  async function handleResubscribe() {
    setWorking(true);
    const r = await fetch(`${BASE}/api/email/resubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, sig }),
    }).catch(() => null);
    setWorking(false);
    setState(r?.ok ? "resubscribed" : "error");
  }

  if (state === "loading") {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--muted)]" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="display text-3xl">Invalid link</h1>
        <p className="text-[color:var(--muted)]">
          This unsubscribe link is invalid or has already been used.
          If you'd like to manage your email preferences, sign in and visit your settings.
        </p>
        <Link href="/sign-in" className="text-sm underline text-[color:var(--ink)]">
          Sign in
        </Link>
      </div>
    );
  }

  if (state === "resubscribed") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="display text-3xl">You&apos;re back!</h1>
        <p className="text-[color:var(--muted)]">
          You&apos;ve resubscribed to exam-helper emails. We&apos;ll only send you things worth reading.
        </p>
        <Link href="/app" className="text-sm underline text-[color:var(--ink)]">
          Go to app
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <h1 className="display text-4xl">Unsubscribed</h1>
      <p className="text-[color:var(--muted)]">
        You won&apos;t receive broadcast emails from exam-helper anymore.
        Transactional emails (password reset, verification) are unaffected.
      </p>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={handleResubscribe}
        disabled={working}
      >
        {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Changed your mind? Resubscribe
      </Button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
