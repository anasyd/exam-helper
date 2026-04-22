import Link from "next/link";
import { AuthDropdown } from "@/components/auth/auth-dropdown";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(250,250,247,0.85)] border-b border-[color:var(--rule)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="display text-xl tracking-tight flex items-center gap-2"
        >
          <span className="text-[color:var(--accent)]">◇</span>
          <span>exam-helper</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="text-sm px-4 py-2 rounded-sm bg-[color:var(--ink)] text-[color:var(--canvas)] hover:opacity-90 transition-opacity"
          >
            Try it free
          </Link>
          <AuthDropdown />
        </div>
      </div>
    </nav>
  );
}
