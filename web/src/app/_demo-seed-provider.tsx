"use client";

import { useEffect, useRef } from "react";
import { seedDemoData } from "@/lib/demo-seed";
import { useSession } from "@/lib/auth/client";
import { useFlashcardStore } from "@/lib/store";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

export function DemoSeedProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const serverSeedCalledRef = useRef(false);

  // Seed the local Zustand store for every first-time visitor (even unauthenticated)
  useEffect(() => {
    seedDemoData();
  }, []);

  // When authenticated, also upload a real PDF to GridFS so the files page shows it
  useEffect(() => {
    if (!session?.user || serverSeedCalledRef.current) return;
    serverSeedCalledRef.current = true;

    void (async () => {
      try {
        const res = await fetch(`${BASE}/api/demo/seed`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { documentFileId: string; projectId: string };

        // Patch the store project with the real GridFS file ID so the Source tab shows it
        useFlashcardStore.getState().updateProject(data.projectId, {
          documentFileId: data.documentFileId,
          documentFileName: "mit-8370x-week1.pdf",
        });
      } catch (err) {
        console.warn("demo server seed failed", err);
      }
    })();
  }, [session?.user]);

  return <>{children}</>;
}
