"use client";

import type { Project } from "./store";
import { useFlashcardStore } from "./store";

export async function seedDemoData(): Promise<void> {
  if (typeof window === "undefined") return;

  const store = useFlashcardStore.getState();

  const existingDemo = store.projects.find((p) => p.id === "demo-intro-to-qc");
  if (existingDemo) {
    const roadmapCardCount = existingDemo.flashcards.filter((f) => (f as any).sourceTopicTitle).length;
    if (roadmapCardCount >= 50) {
      // Demo is up-to-date; mark attempted so we stop checking.
      store.setDemoSeedAttempted(true);
      return;
    }
    // Old demo has too few roadmap cards — fall through to replace it.
  } else if (store.demoSeedAttempted) {
    // User previously deleted the demo; don't re-add it.
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

    const seededProject: Project = {
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
      flashcards: project.flashcards.map((f) => ({
        ...f,
        lastSeen: null,
      })),
    } as Project;

    useFlashcardStore.setState((state) => ({
      // Replace existing demo project if present, otherwise prepend it
      projects: state.projects.some((p) => p.id === "demo-intro-to-qc")
        ? state.projects.map((p) => (p.id === "demo-intro-to-qc" ? seededProject : p))
        : [seededProject, ...state.projects],
    }));
  } catch (err) {
    console.warn("demo-seed failed", err);
  }
}
