import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These would come from environment variables in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const isBrowser = typeof window !== 'undefined';

// For client-side only features
let supabaseInstance: SupabaseClient | null = null;

// Function to get supabase client - ensures we have a client instance when needed
function getSupabaseClient() {
  // In the browser, create a real client if we don't have one yet
  if (isBrowser && !supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  // If we have a client instance, return it
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Otherwise create a new one (this happens in server-side rendering)
  return createClient(supabaseUrl, supabaseAnonKey);
}

// This proxy ensures we only call Supabase methods in the browser or in dynamic server context
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    // Prevent Supabase API calls during static build
    if (isStaticExport && !isBrowser) {
      // Return dummy objects for top-level Supabase methods
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
          signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
          signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
          signInWithOAuth: () => Promise.resolve({ data: { provider: null, url: null }, error: null }),
          signOut: () => Promise.resolve({ error: null }),
          resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
          updateUser: () => Promise.resolve({ data: { user: null }, error: null })
        };
      }
      
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: [], error: null }),
          insert: () => ({ data: [], error: null }),
          update: () => ({ data: [], error: null }),
          delete: () => ({ data: [], error: null }),
          eq: () => ({ data: [], error: null }),
          match: () => ({ data: [], error: null })
        });
      }
      
      return () => {};
    }
    
    // For browser or dynamic server environments, get the actual client
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    
    // If the property is a method, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
});

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