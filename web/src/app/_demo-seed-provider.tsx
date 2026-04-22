"use client";

import { useEffect } from "react";
import { seedDemoData } from "@/lib/demo-seed";

export function DemoSeedProvider({ children }: { children: React.ReactNode }) {
  // Auto-seeds the "Introduction to Quantum Computing" demo project for every
  // first-time visitor so they can try the app end-to-end without uploading a
  // document. seedDemoData() no-ops after the first attempt (tracked in the
  // persisted store), so deleted demos stay deleted.
  useEffect(() => {
    seedDemoData();
  }, []);
  return <>{children}</>;
}
