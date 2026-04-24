"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { AuthDropdown } from "@/components/auth/auth-dropdown";
import { LogoIcon } from "@/components/logo-icon";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-8 h-8 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function AppNav() {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <Link
          href="/app"
          className="flex items-center gap-2 font-semibold text-sm shrink-0"
        >
          <LogoIcon size={20} />
          <span className="hidden sm:inline">exam-helper</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <AuthDropdown />
        </div>
      </div>
    </nav>
  );
}
