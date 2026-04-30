"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const anyLoading = emailLoading || googleLoading;

  useEffect(() => {
    const reset = (e: PageTransitionEvent) => { if (e.persisted) { setGoogleLoading(false); setEmailLoading(false); } };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    const result = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: window.location.origin + "/app",
    });
    setEmailLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Sign-up failed");
      return;
    }
    toast.success("Account created. Check your inbox to verify your email.");
    router.replace("/verify-email?email=" + encodeURIComponent(email));
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/app",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Create your account</h1>
        <p className="text-[color:var(--muted)]">
          Save your projects across devices.
        </p>
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
            disabled={anyLoading}
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
            disabled={anyLoading}
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
            disabled={anyLoading}
          />
          <p className="text-xs text-[color:var(--muted)]">
            At least 8 characters.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={anyLoading}>
          {emailLoading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[color:var(--rule)]" />
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          or
        </span>
        <div className="flex-1 border-t border-[color:var(--rule)]" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogle}
        disabled={anyLoading}
      >
        {googleLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>

      <p className="text-center text-sm text-[color:var(--muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline text-[color:var(--ink)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
