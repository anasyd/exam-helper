"use client";

import type { Project } from "./store";
import { useFlashcardStore } from "./store";

export async function seedDemoData(): Promise<void> {
  if (typeof window === "undefined") return;

  const store = useFlashcardStore.getState();
  if (store.projects.some((p) => p.id === "demo-intro-to-qc")) {
    return;
  }

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
      activeProjectId: project.id,
    }));
  } catch (err) {
    console.warn("demo-seed failed", err);
  }
}
