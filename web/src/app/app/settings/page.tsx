"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SettingsContent } from "@/components/app-settings";
import { BILLING_ENABLED } from "@/lib/billing";
import { fetchMe, type MeResponse } from "@/lib/api/me";
import { useSession } from "@/lib/auth/client";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

async function handleManageSubscription() {
  const res = await fetch(`${BASE}/api/stripe/portal`, { method: "POST", credentials: "include" });
  const data = await res.json() as { url?: string; error?: string };
  if (data.url) window.location.href = data.url;
  else toast.error(data.error ?? "Couldn't open billing portal");
}

export default function SettingsPage() {
  const session = useSession();
  const [meData, setMeData] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (session.data?.user) {
      fetchMe().then(setMeData).catch(() => null);
    }
  }, [session.data?.user]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to projects
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>

      <SettingsContent />

      {BILLING_ENABLED && meData && (
        <div className="pt-6 border-t space-y-3">
          <h2 className="text-lg font-semibold">Plan</h2>
          <div>
            <p className="text-sm font-medium capitalize">{meData.planTier} plan</p>
            <p className="text-xs text-muted-foreground">
              {meData.usage.projects} of{" "}
              {meData.usage.limits.projects === Infinity
                ? "unlimited"
                : meData.usage.limits.projects}{" "}
              projects used
            </p>
          </div>
          {meData.planTier === "free" ? (
            <Button variant="outline" asChild>
              <Link href="/pricing">Upgrade plan</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void handleManageSubscription()}
            >
              Manage subscription
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
