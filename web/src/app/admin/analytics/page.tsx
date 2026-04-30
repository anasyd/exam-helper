"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, TrendingUp, Mail, FolderOpen, Cpu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (res.status === 403 || res.status === 401) throw new Error("forbidden");
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface Analytics {
  users: {
    total: number;
    newLast7d: number;
    newLast30d: number;
    byTier: Record<string, number>;
  };
  email: { subscribed: number; unsubscribed: number };
  projects: { total: number };
  jobs: Record<string, number>;
  uptimeSeconds: number;
}

function fmt(n: number | undefined) {
  return (n ?? 0).toLocaleString();
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function uptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TIER_ORDER = ["free", "student", "pro", "admin"] as const;
const TIER_COLORS: Record<string, string> = {
  free: "#55534e",
  student: "#b8854a",
  pro: "#6366f1",
  admin: "#ef4444",
};

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const d = await adminFetch<Analytics>("/api/admin/analytics");
      setData(d);
    } catch (e) {
      if (e instanceof Error && e.message === "forbidden") {
        router.replace("/");
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const paidUsers = (data?.users.byTier["student"] ?? 0) + (data?.users.byTier["pro"] ?? 0);
  const totalJobs = Object.values(data?.jobs ?? {}).reduce((a, b) => a + b, 0);
  const completedJobs = data?.jobs["done"] ?? 0;
  const failedJobs = data?.jobs["failed"] ?? 0;
  const runningJobs = data?.jobs["running"] ?? 0;

  return (
    <div className="mx-auto py-8 px-6 max-w-5xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> User management
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Live metrics from your MongoDB</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total users" value={fmt(data.users.total)} />
            <StatCard icon={TrendingUp} label="New (7d)" value={fmt(data.users.newLast7d)} sub={`${fmt(data.users.newLast30d)} in last 30d`} />
            <StatCard icon={Users} label="Paid users" value={fmt(paidUsers)} sub={pct(paidUsers, data.users.total) + " conversion"} />
            <StatCard icon={FolderOpen} label="Projects" value={fmt(data.projects.total)} sub={data.users.total ? `${(data.projects.total / data.users.total).toFixed(1)} avg/user` : undefined} />
          </div>

          {/* Tier breakdown */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Plan distribution</h2>
            <div className="space-y-3">
              {TIER_ORDER.map((tier) => {
                const count = data.users.byTier[tier] ?? 0;
                const width = data.users.total ? (count / data.users.total) * 100 : 0;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-mono capitalize text-muted-foreground">{tier}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${width}%`, background: TIER_COLORS[tier] }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm tabular-nums">{fmt(count)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground">{pct(count, data.users.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email + Jobs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email health
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subscribed</span>
                  <span className="tabular-nums font-medium">{fmt(data.email.subscribed)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unsubscribed</span>
                  <span className="tabular-nums font-medium text-muted-foreground">{fmt(data.email.unsubscribed)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">Opt-in rate</span>
                  <span className="tabular-nums font-medium">
                    {pct(data.email.subscribed, data.email.subscribed + data.email.unsubscribed)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5" /> Generation jobs
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="tabular-nums font-medium">{fmt(totalJobs)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="tabular-nums font-medium text-green-500">{fmt(completedJobs)}</span>
                </div>
                {failedJobs > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Failed</span>
                    <span className="tabular-nums font-medium text-destructive">{fmt(failedJobs)}</span>
                  </div>
                )}
                {runningJobs > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Running</span>
                    <span className="tabular-nums font-medium text-yellow-500">{fmt(runningJobs)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">Success rate</span>
                  <span className="tabular-nums font-medium">{pct(completedJobs, totalJobs)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Server */}
          <div className="rounded-2xl border border-border bg-card px-6 py-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" /> Server uptime
            </span>
            <span className="font-mono">{uptime(data.uptimeSeconds)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
