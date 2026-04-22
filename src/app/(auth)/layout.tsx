import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} landing-surface min-h-screen`}
    >
      <nav className="border-b border-[color:var(--rule)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="display text-xl flex items-center gap-2">
            <span className="text-[color:var(--accent)]">◇</span>
            exam-helper
          </Link>
        </div>
      </nav>
      <main className="max-w-md mx-auto px-6 py-16 md:py-24">{children}</main>
    </div>
  );
}
