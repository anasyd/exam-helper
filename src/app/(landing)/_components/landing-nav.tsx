import Link from "next/link";

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
        <Link
          href="/app"
          className="bg-[color:var(--ink)] text-[color:var(--canvas)] px-5 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try it free
        </Link>
      </div>
    </nav>
  );
}
