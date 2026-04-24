"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (res.status === 403 || res.status === 401) throw new Error("forbidden");
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    adminFetch<{ count: number }>("/api/admin/email/recipients")
      .then((d) => setRecipientCount(d.count))
      .catch((e) => {
        if (e instanceof Error && e.message === "forbidden") router.replace("/");
      });
  }, [router]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send "${subject}" to ${recipientCount} verified users?`)) return;
    setSending(true);
    setResult(null);
    try {
      const data = await adminFetch<{ ok: boolean; sent: number; total: number }>(
        "/api/admin/email/broadcast",
        { method: "POST", body: JSON.stringify({ subject, message }) },
      );
      setResult({ sent: data.sent, total: data.total });
      toast.success(`Sent to ${data.sent} of ${data.total} users`);
      setSubject("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> User management
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Broadcast Email</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send a message to all verified users
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {recipientCount === null ? (
          <span>Loading recipients…</span>
        ) : (
          <span><strong className="text-foreground">{recipientCount}</strong> verified users will receive this</span>
        )}
      </div>

      <form onSubmit={handleSend} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            className="rounded-full"
            placeholder="What's this email about?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <textarea
            id="message"
            className="w-full min-h-48 rounded-2xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            placeholder={"Write your message here.\n\nBlank lines create new paragraphs."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Plain text — blank lines become paragraph breaks</p>
        </div>

        <Button
          type="submit"
          className="rounded-full"
          disabled={sending || recipientCount === 0}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {recipientCount ?? "…"} users
            </>
          )}
        </Button>
      </form>

      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          Sent to <strong>{result.sent}</strong> of <strong>{result.total}</strong> users.
          {result.sent < result.total && (
            <span className="text-destructive ml-2">{result.total - result.sent} failed — check server logs.</span>
          )}
        </div>
      )}
    </div>
  );
}
