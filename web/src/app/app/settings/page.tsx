"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SettingsContent } from "@/components/app-settings";
import { BILLING_ENABLED } from "@/lib/billing";
import { fetchMe, type MeResponse } from "@/lib/api/me";
import { useSession } from "@/lib/auth/client";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  student: "Student",
  pro: "Pro",
  admin: "Admin",
};

export default function SettingsPage() {
  const session = useSession();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (session.data?.user) {
      fetchMe().then(setMeData).catch(() => null);
    }
  }, [session.data?.user]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await fetch(`${BASE}/api/billing/portal`, { method: "POST", credentials: "include" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "Couldn't open billing portal");
    } catch {
      toast.error("Couldn't open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
      <div className="space-y-1">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back to projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <SettingsContent />

      {BILLING_ENABLED && meData && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Plan</p>
          <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">{TIER_LABELS[meData.planTier] ?? meData.planTier} plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meData.usage.projects} of{" "}
                  {meData.usage.limits.projects === Infinity ? "unlimited" : meData.usage.limits.projects} projects ·{" "}
                  {meData.usage.limits.pdfsPerProject} PDFs per project ·{" "}
                  {meData.usage.limits.maxFileSizeMb} MB max
                </p>
              </div>
              {meData.planTier === "free" && (
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-1 rounded">
                  Free
                </span>
              )}
            </div>
            {meData.planTier === "free" ? (
              <Button asChild size="sm">
                <Link href="/pricing" className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Upgrade plan
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleManageSubscription()}
                disabled={portalLoading}
              >
                {portalLoading ? "Opening…" : "Manage subscription"}
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
