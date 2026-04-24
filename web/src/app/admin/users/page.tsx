"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ChevronLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  planTier: string;
  createdAt: string;
  emailVerified: boolean;
}

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

const TIER_COLORS: Record<string, string> = {
  free: "secondary",
  student: "outline",
  pro: "default",
  admin: "destructive",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", planTier: "free" });
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminFetch<AdminUser[]>("/api/admin/users");
      setUsers(data);
    } catch (e) {
      if (e instanceof Error && e.message === "forbidden") {
        router.replace("/");
      } else {
        toast.error("Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success(`Account created for ${form.email}`);
      setForm({ name: "", email: "", password: "", planTier: "free" });
      setCreateOpen(false);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      toast.success(`Deleted ${user.email}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleTierChange = async (userId: string, planTier: string) => {
    try {
      await adminFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ planTier }),
      });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, planTier } : u));
      toast.success("Plan updated");
    } catch {
      toast.error("Failed to update plan");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Back to app
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin panel — manage accounts and plan tiers</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/email">
            <Button variant="outline" className="rounded-full">
              <Mail className="h-4 w-4 mr-2" />
              Broadcast email
            </Button>
          </Link>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="rounded-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input className="rounded-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input className="rounded-full" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={form.planTier} onValueChange={(v: string) => setForm({ ...form, planTier: v })}>
                  <SelectTrigger className="rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.planTier}
                    onValueChange={(v: string) => void handleTierChange(user.id, v)}
                    disabled={user.planTier === "admin"}
                  >
                    <SelectTrigger className="h-7 rounded-full w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(user)}
                    disabled={user.planTier === "admin"}
                    title={user.planTier === "admin" ? "Cannot delete admin" : "Delete user"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
