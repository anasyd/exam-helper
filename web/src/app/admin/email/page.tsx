"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, Send, Users, Bold, Italic, List, Link as LinkIcon, Heading2 } from "lucide-react";
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

function wrap(text: string, before: string, after: string, placeholder: string) {
  const ta = document.getElementById("message-area") as HTMLTextAreaElement | null;
  if (!ta) return text;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = text.slice(start, end) || placeholder;
  const next = text.slice(0, start) + before + sel + after + text.slice(end);
  setTimeout(() => {
    ta.focus();
    ta.setSelectionRange(start + before.length, start + before.length + sel.length);
  }, 0);
  return next;
}

function insertAt(text: string, token: string): string {
  const ta = document.getElementById("message-area") as HTMLTextAreaElement | null;
  if (!ta) return text + token;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const next = text.slice(0, start) + token + text.slice(end);
  setTimeout(() => {
    ta.focus();
    ta.setSelectionRange(start + token.length, start + token.length);
  }, 0);
  return next;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [unsubCount, setUnsubCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    adminFetch<{ count: number; unsubscribed: number }>("/api/admin/email/recipients")
      .then((d) => { setRecipientCount(d.count); setUnsubCount(d.unsubscribed); })
      .catch((e) => {
        if (e instanceof Error && e.message === "forbidden") router.replace("/");
      });
  }, [router]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send "${subject}" to ${recipientCount} subscribed users?`)) return;
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

  const fmt = (before: string, after: string, placeholder: string) =>
    setMessage((m) => wrap(m, before, after, placeholder));
  const ins = (token: string) =>
    setMessage((m) => insertAt(m, token));

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
        <p className="text-sm text-muted-foreground mt-1">Send a message to all subscribed users</p>
      </div>

      <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {recipientCount === null ? "Loading…" : (
            <><strong className="text-foreground">{recipientCount}</strong> subscribed recipients</>
          )}
        </span>
        {unsubCount !== null && unsubCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{unsubCount} unsubscribed</span>
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

        <div className="space-y-1.5">
          <Label htmlFor="message-area">Message</Label>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-0.5 rounded-t-xl border border-b-0 border-input bg-muted/40 px-2 py-1.5">
            <button type="button" title="Bold (**text**)" onClick={() => fmt("**", "**", "bold text")}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Italic (*text*)" onClick={() => fmt("*", "*", "italic text")}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Heading (## text)" onClick={() => fmt("## ", "", "Heading")}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Bullet list (- item)" onClick={() => fmt("- ", "", "list item")}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <List className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Link ([text](url))"
              onClick={() => {
                const url = prompt("URL:");
                if (url) fmt("[", `](${url})`, "link text");
              }}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1.5 h-4 w-px bg-border shrink-0" />
            <button type="button" title="Insert recipient's name" onClick={() => ins("{{name}}")}
              className="px-2 py-1 rounded hover:bg-muted transition-colors text-[11px] text-muted-foreground hover:text-foreground font-mono">
              {"{{name}}"}
            </button>
            <button type="button" title="Insert recipient's email" onClick={() => ins("{{email}}")}
              className="px-2 py-1 rounded hover:bg-muted transition-colors text-[11px] text-muted-foreground hover:text-foreground font-mono">
              {"{{email}}"}
            </button>
            <span className="ml-auto text-[11px] text-muted-foreground/60 pr-1">Markdown</span>
          </div>

          <textarea
            id="message-area"
            className="w-full min-h-56 rounded-b-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
            placeholder={"Write your message here.\n\nUse **bold**, *italic*, ## headings, - bullet lists, or [links](https://example.com)."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="rounded-full" disabled={sending || recipientCount === null || recipientCount === 0}>
          {sending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />Send to {recipientCount ?? "…"} users</>
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
