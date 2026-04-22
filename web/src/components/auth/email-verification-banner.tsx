"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth/client";

const DISMISS_KEY = "ehv-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function EmailVerificationBanner() {
  const session = useSession();
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Sync post-hydration: SSR produces dismissed=true; on the client the
    // real sessionStorage value may differ. One-shot, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed());
  }, []);

  if (dismissed || !session.data?.user || session.data.user.emailVerified) {
    return null;
  }

  async function handleResend() {
    setSending(true);
    const result = await authClient.sendVerificationEmail({
      email: session.data!.user.email,
      callbackURL: window.location.origin + "/app",
    });
    setSending(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't send email");
      return;
    }
    toast.success("Verification email sent.");
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="bg-[color:var(--accent)] bg-opacity-10 border-b border-[color:var(--rule)] px-6 py-3 text-sm flex items-center justify-center gap-3 flex-wrap">
      <span>Verify your email to save your progress across devices.</span>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="underline hover:no-underline disabled:opacity-50"
      >
        {sending ? "Sending…" : "Resend"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-xs text-muted-foreground hover:underline ml-2"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
