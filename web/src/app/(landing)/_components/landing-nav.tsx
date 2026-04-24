"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { AuthDropdown } from "@/components/auth/auth-dropdown";
import { LogoIcon } from "@/components/logo-icon";
import { useSession } from "@/lib/auth/client";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-8 h-8 flex items-center justify-center rounded-sm text-[color:var(--nav-icon)] hover:text-[color:var(--nav-ink)] transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function LandingNav() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-[color:var(--rule)]" style={{ backgroundColor: "var(--nav-bg)" }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="display text-xl tracking-tight flex items-center gap-2"
        >
          <LogoIcon size={22} />
          <span>exam-helper</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/anasyd/exam-helper"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-sm text-[color:var(--nav-icon)] hover:text-[color:var(--nav-ink)] transition-colors"
            aria-label="View on GitHub"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
          </a>
          <ThemeToggle />
          {!isLoggedIn && (
            <Link
              href="/app"
              className="hidden md:inline-flex text-sm px-4 py-2 rounded-sm bg-[color:var(--nav-ink)] text-[color:var(--nav-canvas)] hover:opacity-90 transition-opacity"
            >
              Try it free
            </Link>
          )}
          <AuthDropdown />
        </div>
      </div>
    </nav>
  );
}
