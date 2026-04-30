"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, Key, Cpu, Database, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SettingsContent } from "@/components/app-settings";
import { BILLING_ENABLED } from "@/lib/billing";
import { fetchMe, type MeResponse } from "@/lib/api/me";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  student: "Student",
  pro: "Pro",
  admin: "Admin",
};

type Section = "ai-keys" | "model-routing" | "data" | "notifications" | "plan";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType; hidden?: boolean }[] = [
  { id: "ai-keys",       label: "AI Keys",        icon: Key },
  { id: "model-routing", label: "Model Routing",   icon: Cpu },
  { id: "data",          label: "Data",            icon: Database },
  { id: "notifications", label: "Notifications",   icon: Bell },
  { id: "plan",          label: "Plan",            icon: CreditCard, hidden: !BILLING_ENABLED },
];

export default function SettingsPage() {
  const session = useSession();
  const [section, setSection] = useState<Section>("ai-keys");
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState<{ productUpdates: boolean } | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);

  useEffect(() => {
    if (session.data?.user) {
      fetchMe().then(setMeData).catch(() => null);
    }
  }, [session.data?.user]);

  useEffect(() => {
    if (section === "notifications" && session.data?.user && emailPrefs === null) {
      fetch(`${BASE}/api/me/email-prefs`, { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.json() as Promise<{ productUpdates: boolean }>;
        })
        .then(setEmailPrefs)
        .catch((e) => {
          toast.error(`Could not load email preferences: ${e instanceof Error ? e.message : "unknown error"}`);
        });
    }
  }, [section, session.data?.user, emailPrefs]);

  async function togglePref(key: keyof NonNullable<typeof emailPrefs>, value: boolean) {
    if (!emailPrefs) return;
    setEmailPrefs({ ...emailPrefs, [key]: value });
    setPrefsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/me/email-prefs`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      setEmailPrefs({ ...emailPrefs, [key]: !value });
      toast.error("Failed to save preference");
    } finally {
      setPrefsLoading(false);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await fetch(`${BASE}/api/billing/portal`, { method: "POST", credentials: "include" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
      else toast.error(data.error ?? "Couldn't open billing portal");
    } catch {
      toast.error("Couldn't open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  const visibleNav = NAV_ITEMS.filter((n) => !n.hidden);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4" /> Back to projects
        </Link>

        <div className="flex gap-8 items-start">
          {/* Side nav */}
          <aside className="w-48 shrink-0 sticky top-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-3">
              Settings
            </p>
            <nav className="flex flex-col gap-0.5">
              {visibleNav.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full",
                    section === id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {section === "ai-keys" && (
              <SettingsContent activeSection="ai-keys" />
            )}
            {section === "model-routing" && (
              <SettingsContent activeSection="model-routing" />
            )}
            {section === "data" && (
              <SettingsContent activeSection="data" />
            )}
            {section === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Choose which emails you receive from us</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Email categories</p>
                  <div className="divide-y divide-border rounded-xl border">
                    <div className="flex items-start justify-between gap-4 px-5 py-4">
                      <div>
                        <p className="text-sm font-medium">Product updates</p>
                        <p className="text-xs text-muted-foreground mt-0.5">News, announcements, and feature updates from exam-helper</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={emailPrefs?.productUpdates ?? false}
                        disabled={emailPrefs === null || prefsLoading}
                        onClick={() => emailPrefs && void togglePref("productUpdates", !emailPrefs.productUpdates)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                          emailPrefs?.productUpdates ? "bg-primary" : "bg-input",
                        )}
                      >
                        <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform", emailPrefs?.productUpdates ? "translate-x-4" : "translate-x-0")} />
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-4 px-5 py-4">
                      <div>
                        <p className="text-sm font-medium">Account &amp; security</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Password resets, email verification, and important account alerts</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={true}
                        disabled
                        className="relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full border-2 border-transparent bg-primary opacity-50 transition-colors"
                      >
                        <span className="pointer-events-none block h-4 w-4 translate-x-4 rounded-full bg-background shadow-lg ring-0 transition-transform" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground px-1 pt-1">Account &amp; security emails are always sent and cannot be turned off.</p>
                </div>
              </div>
            )}
            {section === "plan" && BILLING_ENABLED && meData && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Plan</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and usage</p>
                </div>
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
                  ) : meData.planTier !== "admin" ? (
                    <div className="flex flex-col items-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => void handleManageSubscription()} disabled={portalLoading}>
                        {portalLoading ? "Opening…" : "Manage subscription"}
                      </Button>
                      {meData.planCancelledAt && (
                        <p className="text-xs text-muted-foreground">
                          Cancels {new Date(meData.planCancelledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
