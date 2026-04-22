import type { ReactNode } from "react";
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

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} landing-surface`}
      data-surface="landing"
    >
      {children}
    </div>
  );
}
