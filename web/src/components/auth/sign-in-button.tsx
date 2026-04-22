"use client";

import Link from "next/link";

export function SignInButton() {
  return (
    <Link
      href="/sign-in"
      className="text-sm px-4 py-2 rounded-sm border border-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-[color:var(--canvas)] transition-colors"
    >
      Sign in
    </Link>
  );
}
