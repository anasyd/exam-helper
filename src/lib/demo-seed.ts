"use client";

import type { Project } from "./store";
import { useFlashcardStore } from "./store";

export async function seedDemoData(): Promise<void> {
  if (typeof window === "undefined") return;

  const store = useFlashcardStore.getState();
  // Only attempt once per browser. If the user deletes the demo project, it stays gone.
  if (store.demoSeedAttempted) {
    return;
  }
  if (store.projects.some((p) => p.id === "demo-intro-to-qc")) {
    // Already present (e.g., from an earlier dev run); mark attempted so we stop trying.
    store.setDemoSeedAttempted(true);
    return;
  }

  // Mark up-front so a failed fetch doesn't retry on every page load.
  store.setDemoSeedAttempted(true);

  try {
    const res = await fetch("/demo-seed.json", { cache: "no-store" });
    if (!res.ok) return;
    const { project } = (await res.json()) as {
      project: {
        id: string;
        name: string;
        description: string;
        pdfContent: string;
        processedHashes: string[];
        cardsSeenThisSession: string[];
        sessionComplete: boolean;
        xp: number;
        flashcards: Array<{
          id: string;
          question: string;
          answer: string;
          options: string[];
          correctOptionIndex: number;
          difficulty: number;
          lastSeen: null;
          timesCorrect: number;
          timesIncorrect: number;
        }>;
        documentNotes: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- seed JSON is already-shaped StudyGuide
        studyGuide: any;
      };
    };

    useFlashcardStore.setState((state) => ({
      projects: [
        ...state.projects,
        {
          ...project,
          createdAt: new Date(),
          updatedAt: new Date(),
          flashcards: project.flashcards.map((f) => ({
            ...f,
            lastSeen: null,
          })),
        } as Project,
      ],
      // Do NOT set activeProjectId — land users on the project list so they see the demo
      // alongside any projects they create. They can click "Open Project" to explore it.
    }));
  } catch (err) {
    console.warn("demo-seed failed", err);
  }
}
