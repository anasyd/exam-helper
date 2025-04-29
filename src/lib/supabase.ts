import { createClient } from '@supabase/supabase-js';

// These would come from environment variables in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define database types
export type DbProject = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  shared_id?: string | null;
};

export type DbFlashcard = {
  id: string;
  project_id: string;
  question: string;
  answer: string;
  options: string[];
  correct_option_index: number;
  difficulty: number;
  last_seen: string | null;
  times_correct: number;
  times_incorrect: number;
  source_hash?: string | null;
};

// Functions to convert between database and application types
export const convertDbProjectToAppProject = (dbProject: DbProject, flashcards: DbFlashcard[] = []) => {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    createdAt: new Date(dbProject.created_at),
    updatedAt: new Date(dbProject.updated_at),
    flashcards: flashcards.map(convertDbFlashcardToAppFlashcard),
    pdfContent: null,
    processedHashes: [],
    skippedCards: [],
    sessionComplete: false
  };
};

export const convertDbFlashcardToAppFlashcard = (dbFlashcard: DbFlashcard) => {
  return {
    id: dbFlashcard.id,
    question: dbFlashcard.question,
    answer: dbFlashcard.answer,
    options: dbFlashcard.options,
    correctOptionIndex: dbFlashcard.correct_option_index,
    difficulty: dbFlashcard.difficulty,
    lastSeen: dbFlashcard.last_seen ? new Date(dbFlashcard.last_seen) : null,
    timesCorrect: dbFlashcard.times_correct,
    timesIncorrect: dbFlashcard.times_incorrect,
    sourceHash: dbFlashcard.source_hash || undefined
  };
};

export const convertAppFlashcardToDbFlashcard = (flashcard: any, projectId: string) => {
  return {
    id: flashcard.id,
    project_id: projectId,
    question: flashcard.question,
    answer: flashcard.answer,
    options: flashcard.options,
    correct_option_index: flashcard.correctOptionIndex,
    difficulty: flashcard.difficulty,
    last_seen: flashcard.lastSeen ? new Date(flashcard.lastSeen).toISOString() : null,
    times_correct: flashcard.timesCorrect,
    times_incorrect: flashcard.timesIncorrect,
    source_hash: flashcard.sourceHash
  };
};