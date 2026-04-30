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

function listify(text: string): string {
  const ta = document.getElementById("message-area") as HTMLTextAreaElement | null;
  if (!ta) return text;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = text.slice(start, end);
  if (sel.includes("\n")) {
    const transformed = sel.split("\n").map((l) => `- ${l}`).join("\n");
    const next = text.slice(0, start) + transformed + text.slice(end);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start, start + transformed.length); }, 0);
    return next;
  }
  const token = `- ${sel || "list item"}`;
  const next = text.slice(0, start) + token + text.slice(end);
  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, start + token.length); }, 0);
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

const INLINE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;

function inlineNodes(s: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const matches = [...s.matchAll(INLINE_RE)];
  let last = 0;
  let key = 0;
  for (const m of matches) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={key++} style={{ color: "#f0ede6" }}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={key++}>{m[2]}</em>);
    else if (m[3] !== undefined) parts.push(<a key={key++} href={m[4]} style={{ color: "#b8854a", textDecoration: "underline" }}>{m[3]}</a>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

function EmailPreviewBody({ md }: { md: string }) {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flush = () => {
    if (listItems.length) {
      blocks.push(<ul key={key++} style={{ margin: "0 0 14px", paddingLeft: 18, color: "#c8c3b8" }}>{listItems}</ul>);
      listItems = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      flush();
      blocks.push(<p key={key++} style={{ margin: "0 0 12px", color: "#f0ede6", fontSize: 15, fontWeight: 600 }}>{inlineNodes(line.replace(/^#{1,3}\s/, ""))}</p>);
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(<li key={key++} style={{ marginBottom: 5 }}>{inlineNodes(line.replace(/^[-*]\s/, ""))}</li>);
    } else if (line === "") {
      flush();
    } else {
      flush();
      blocks.push(<p key={key++} style={{ margin: "0 0 14px", color: "#c8c3b8" }}>{inlineNodes(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [unsubCount, setUnsubCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    adminFetch<{ count: number; unsubscribed: number }>("/api/admin/email/recipients")
      .then((d) => { setRecipientCount(d.count); setUnsubCount(d.unsubscribed); })
      .catch((e) => {
        if (e instanceof Error && e.message === "forbidden") {
          router.replace("/");
        } else {
          toast.error(e instanceof Error ? e.message : "Failed to load recipients");
          setRecipientCount(0);
        }
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
        { method: "POST", body: JSON.stringify({ subject, message, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined }) },
      );
      setResult({ sent: data.sent, total: data.total });
      toast.success(`Sent to ${data.sent} of ${data.total} users`);
      setSubject("");
      setMessage("");
      setCtaLabel("");
      setCtaUrl("");
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
    <div className="mx-auto py-8 px-6 max-w-6xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> User management
      </Link>

      <div className="mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Editor */}
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
              <button type="button" title="Bullet list — select multiple lines to convert each"
                onClick={() => setMessage((m) => listify(m))}
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
              className="w-full min-h-72 rounded-b-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
              placeholder={"Write your message here.\n\nUse **bold**, *italic*, ## headings, - bullet lists, or [links](https://example.com)."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm">CTA Button <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                className="rounded-full"
                placeholder="Button label, e.g. Check it out →"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
              />
              <Input
                className="rounded-full"
                placeholder="https://…"
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="rounded-full" disabled={sending || recipientCount === null || recipientCount === 0}>
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Send to {recipientCount ?? "…"} users</>
            )}
          </Button>

          {result && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
              Sent to <strong>{result.sent}</strong> of <strong>{result.total}</strong> users.
              {result.sent < result.total && (
                <span className="text-destructive ml-2">{result.total - result.sent} failed — check server logs.</span>
              )}
            </div>
          )}
        </form>

        {/* Live preview */}
        <div className="lg:sticky lg:top-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Preview</p>
          <div className="rounded-xl overflow-hidden border border-[#2c2a26]" style={{ background: "#161513", fontFamily: "system-ui,-apple-system,sans-serif" }}>
            <div className="px-5 py-3 border-b border-[#2c2a26]">
              <p style={{ margin: 0, fontSize: 12, color: "#55534e" }}>
                <span style={{ color: "#7a7670" }}>Subject: </span>
                <span style={{ color: "#c8c3b8" }}>{subject || "—"}</span>
              </p>
            </div>
            <div className="px-6 py-5">
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#b8854a", fontWeight: 700 }}>exam-helper</p>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#f0ede6" }}>Hi {"{{name}}"},</p>
              {message ? (
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <EmailPreviewBody md={message} />
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#55534e", fontStyle: "italic" }}>Your message will appear here…</p>
              )}
              {ctaLabel && ctaUrl && (
                <div style={{ margin: "20px 0" }}>
                  <a href={ctaUrl} style={{ display: "inline-block", padding: "10px 24px", background: "#b8854a", color: "#fafaf7", textDecoration: "none", borderRadius: 24, fontSize: 13, fontWeight: 500, fontFamily: "system-ui,sans-serif" }}>{ctaLabel}</a>
                </div>
              )}
              <div style={{ borderTop: "1px solid #2c2a26", paddingTop: 16, marginTop: 20, fontSize: 11, color: "#55534e" }}>
                You&apos;re receiving this because you subscribed to exam-helper updates.
                <br />
                <span style={{ color: "#b8854a" }}>Unsubscribe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
