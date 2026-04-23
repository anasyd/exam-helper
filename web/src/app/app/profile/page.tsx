"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const session = useRequireAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (session.isPending || !session.data?.user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const user = session.data.user;
  const displayName = name || user.name || "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === user.name) return;
    setSaving(true);
    const result = await authClient.updateUser({ name: name.trim() });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't save");
      return;
    }
    toast.success("Name updated");
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/");
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 space-y-10">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to projects
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-semibold mb-2">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user.email} disabled />
          {!user.emailVerified && (
            <p className="text-xs text-[color:var(--accent,#b8854a)]">
              Unverified — check your inbox for the verification link.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder={user.name ?? "Your name"}
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !name.trim() || name === user.name}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>

      <div className="pt-6 border-t">
        <Button type="button" variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
