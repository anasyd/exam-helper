"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth/client";
import { SignInButton } from "./sign-in-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, User, FolderOpen, LogOut, ShieldCheck } from "lucide-react";
import { AppSettings } from "@/components/app-settings";
import { fetchMe } from "@/lib/api/me";

function initialsFrom(name: string | null | undefined, email: string): string {
  const source = (name ?? email).trim();
  if (!source) return "?";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || source[0]!.toUpperCase();
}

export function AuthDropdown() {
  const session = useSession();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [planTier, setPlanTier] = useState<string | null>(null);

  useEffect(() => {
    if (session.data?.user) {
      fetchMe().then(d => setPlanTier(d.planTier)).catch(() => null);
    }
  }, [session.data?.user]);

  if (session.isPending) {
    return <div className="w-24 h-9" aria-hidden="true" />;
  }

  if (!session.data?.user) {
    return <SignInButton />;
  }

  const user = session.data.user;
  const initials = initialsFrom(user.name ?? null, user.email);

  async function handleSignOut() {
    try {
      await authClient.signOut();
      toast.success("Signed out");
    } catch {
      // sign-out errors are non-fatal
    }
    router.replace("/");
  }

  return (
    <>
      <AppSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-[color:var(--ink)] text-[color:var(--canvas)] text-sm font-medium flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Account"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {user.name ?? user.email}
            </span>
            {planTier === "admin" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {user.email}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app" className="flex items-center">
            <FolderOpen className="mr-2 h-4 w-4" />
            My projects
          </Link>
        </DropdownMenuItem>
        {planTier === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users" className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
