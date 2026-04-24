"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { notFound } from "next/navigation";
import { BILLING_ENABLED, BILLING_PROVIDER_NAME } from "@/lib/billing";
import { useSession } from "@/lib/auth/client";
import { fetchMe, type MeResponse } from "@/lib/api/me";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { LandingNav } from "@/app/(landing)/_components/landing-nav";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "5 projects",
      "3 PDFs per project",
      "15 MB max file size",
      "Unlimited flashcards",
      "Bring your own AI key",
    ],
  },
  {
    id: "student",
    name: "Student",
    monthlyPrice: 6,
    yearlyPrice: 55,
    features: [
      "20 projects",
      "5 PDFs per project",
      "25 MB max file size",
      "Unlimited flashcards",
      "Bring your own AI key",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 12,
    yearlyPrice: 100,
    features: [
      "Unlimited projects",
      "10 PDFs per project",
      "50 MB max file size",
      "Unlimited flashcards",
      "Bring your own AI key",
    ],
  },
] as const;

type PlanId = "free" | "student" | "pro";

export default function PricingPage() {
  if (!BILLING_ENABLED) notFound();

  const session = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);

  useEffect(() => {
    if (session.data?.user) {
      fetchMe().then(setMeData).catch(() => null);
    }
  }, [session.data?.user]);

  const currentTier = meData?.planTier ?? null;

  async function handleUpgrade(tier: "student" | "pro") {
    if (!session.data?.user) {
      router.push("/sign-in?redirect=/pricing");
      return;
    }
    setLoading(tier);
    try {
      const res = await fetch(`${BASE}/api/billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Couldn't start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Couldn't start checkout");
    } finally {
      setLoading(null);
    }
  }

  const yearlyDiscount = Math.round((1 - (55 / (6 * 12))) * 100);

  return (
    <>
    <LandingNav />
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Simple pricing</h1>
          <p className="text-muted-foreground">
            Bring your own AI key — we only charge for storage and sync.
          </p>
        </div>

        {/* Interval toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-lg border p-1 gap-1">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                interval === "month"
                  ? "bg-[color:var(--ink)] text-[color:var(--canvas)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                interval === "year"
                  ? "bg-[color:var(--ink)] text-[color:var(--canvas)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                -{yearlyDiscount}%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const price = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
            const isPopular = plan.id === "student";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col gap-5 ${
                  isPopular ? "border-[color:var(--ink)] shadow-lg" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 bg-[color:var(--canvas)]">
                    <span className="text-[11px] font-semibold uppercase tracking-wide bg-[color:var(--ink)] text-[color:var(--canvas)] px-3 py-1 rounded-full whitespace-nowrap inline-block">
                      Most popular
                    </span>
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-semibold mb-1">{plan.name}</h2>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">${price}</span>
                    {price > 0 && (
                      <span className="text-muted-foreground text-sm mb-1">
                        /{interval === "year" ? "yr" : "mo"}
                      </span>
                    )}
                  </div>
                  {price > 0 && interval === "year" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ${(price / 12).toFixed(2)}/mo billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.id === "free" ? (
                  <Button variant="outline" asChild>
                    <Link href={session.data?.user ? "/app" : "/sign-up"}>
                      {session.data?.user ? "Go to app" : "Get started free"}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleUpgrade(plan.id)}
                    disabled={isCurrent || loading !== null}
                    variant={isPopular ? "default" : "outline"}
                  >
                    {isCurrent
                      ? "Current plan"
                      : loading === plan.id
                        ? "Redirecting…"
                        : "Upgrade"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Payments are processed by {BILLING_PROVIDER_NAME}. Cancel anytime.
        </p>
      </div>
    </div>
    </>
  );
}
