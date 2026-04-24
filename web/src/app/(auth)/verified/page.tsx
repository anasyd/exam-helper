"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

export default function VerifiedPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"animating" | "done">("animating");

  useEffect(() => {
    // Fire welcome email — idempotent, safe to call multiple times
    fetch(`${BASE}/api/me/on-verified`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});

    const t1 = setTimeout(() => setPhase("done"), 1800);
    const t2 = setTimeout(() => router.push("/app"), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [router]);

  return (
    <>
      <style>{`
        @keyframes draw-circle {
          from { stroke-dashoffset: 283; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          from { stroke-dashoffset: 80; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0.85); }
          60%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        .circle-path {
          stroke-dasharray: 283;
          stroke-dashoffset: 283;
          animation: draw-circle 0.7s cubic-bezier(0.4,0,0.2,1) 0.2s forwards;
        }
        .check-path {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: draw-check 0.35s ease-out 0.85s forwards;
        }
        .heading-anim {
          animation: fade-up 0.5s ease-out 0.6s both;
        }
        .sub-anim {
          animation: fade-up 0.5s ease-out 0.75s both;
        }
        .button-anim {
          animation: pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
      `}</style>

      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <circle
              cx="48" cy="48" r="45"
              stroke="#b8854a"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="circle-path"
            />
            <path
              d="M29 48 L43 62 L68 35"
              stroke="#b8854a"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-path"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="display text-4xl heading-anim">Email verified!</h1>
          <p className="text-[color:var(--muted)] sub-anim">
            Your account is ready. Taking you to the app…
          </p>
        </div>

        {phase === "done" && (
          <div className="button-anim">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "#b8854a", color: "#fafaf7" }}
            >
              Continue to exam-helper →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
