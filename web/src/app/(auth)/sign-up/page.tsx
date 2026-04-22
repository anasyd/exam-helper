"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: "/app",
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Sign-up failed");
      return;
    }
    toast.success("Account created. Check your inbox to verify your email.");
    router.replace("/verify-email?email=" + encodeURIComponent(email));
  }

  async function handleGoogle() {
    setLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Create your account</h1>
        <p className="text-[color:var(--muted)]">
          Save your projects across devices.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[color:var(--rule)]" />
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          or
        </span>
        <div className="flex-1 border-t border-[color:var(--rule)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="text-xs text-[color:var(--muted)]">
            At least 8 characters.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline text-[color:var(--ink)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
