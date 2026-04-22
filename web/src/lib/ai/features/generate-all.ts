import type { RouterDependencies } from "../router";
import type { FlashcardData, ProjectSource, StudyGuide } from "../types";
import { generateFlashcards } from "./flashcards";
import { generateAutomatedNotes } from "./notes";
import { generateStudyContent } from "./study-guide";

export interface GenerateAllFlags {
  generateStudyGuide: boolean;
  generateNotes: boolean;
  generateFlashcards: boolean;
  flashcardCount?: number;
}

export interface GenerateAllResult {
  studyGuide?: StudyGuide;
  notes?: string;
  flashcards?: FlashcardData[];
}

export async function generateAllContentTypes(
  source: ProjectSource,
  flags: GenerateAllFlags,
  deps: RouterDependencies
): Promise<GenerateAllResult> {
  const result: GenerateAllResult = {};

  if (flags.generateStudyGuide) {
    result.studyGuide = await generateStudyContent(source, deps);
  }
  if (flags.generateNotes) {
    result.notes = await generateAutomatedNotes(source, deps);
  }
  if (flags.generateFlashcards) {
    result.flashcards = await generateFlashcards(source, flags.flashcardCount ?? 10, deps);
  }

  return result;
}
