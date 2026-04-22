"use client";

import { useEffect } from "react";
import { seedDemoData } from "@/lib/demo-seed";

export function DemoSeedProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_SEED === "1") {
      seedDemoData();
    }
  }, []);
  return <>{children}</>;
}
