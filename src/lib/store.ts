"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  options: string[]; // Array of multiple choice options
  correctOptionIndex: number; // Index of the correct option in the array
  difficulty: number; // 1-5, where 1 is easy and 5 is hard
  lastSeen: Date | null;
  timesCorrect: number;
  timesIncorrect: number;
  sourceHash?: string; // Hash of the source PDF content
};

// Define the structure of the persisted state for internal use
type StoreData = {
  flashcards: Flashcard[];
  geminiApiKey: string | null;
  processedHashes: Set<string> | string[];
};

// Helper function to ensure lastSeen is a proper Date object
const ensureDate = (lastSeen: Date | string | null): Date | null => {
  if (lastSeen === null) return null;
  return lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
};

// Helper function to create a simple hash from PDF content
const createContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

interface FlashcardState {
  flashcards: Flashcard[];
  isProcessing: boolean;
  currentCardIndex: number | null;
  pdfContent: string | null;
  processedHashes: Set<string>;
  geminiApiKey: string | null;
  skippedCards: string[]; // Array of skipped card IDs
  sessionComplete: boolean; // Flag to track if the current session is complete
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>) => void;
  addFlashcards: (flashcards: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>[], sourceContent?: string | null) => number;
  markCorrect: (id: string) => void;
  markIncorrect: (id: string) => void;
  skipCard: (id: string) => void; // Add a card to the skipped cards array
  setIsProcessing: (isProcessing: boolean) => void;
  setPdfContent: (content: string | null) => void;
  setGeminiApiKey: (apiKey: string | null) => void;
  clearFlashcards: () => void;
  resetSession: () => void; // Reset the current session (clear skipped cards and sessionComplete flag)
  getNextCard: () => Flashcard | null;
  hasProcessedContent: (content: string) => boolean;
  getDuplicateQuestionCount: (questions: string[]) => number;
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      flashcards: [],
      isProcessing: false,
      currentCardIndex: null,
      pdfContent: null,
      processedHashes: new Set<string>(),
      geminiApiKey: null,
      skippedCards: [],
      sessionComplete: false,

      addFlashcard: (flashcard) => {
        set((state) => ({
          flashcards: [
            ...state.flashcards,
            {
              ...flashcard,
              id: crypto.randomUUID(),
              difficulty: 3, // Start at medium difficulty
              lastSeen: null,
              timesCorrect: 0,
              timesIncorrect: 0,
              // Ensure options and correctOptionIndex are set, default to empty array if not provided
              options: flashcard.options || [],
              correctOptionIndex: flashcard.correctOptionIndex ?? 0,
            },
          ],
        }));
      },

      addFlashcards: (flashcards, sourceContent = null) => {
        let contentHash: string | undefined = undefined;
        
        // If source content is provided, create a hash for it
        if (sourceContent) {
          contentHash = createContentHash(sourceContent);
          
          // Add to processed hashes
          set((state) => ({
            processedHashes: new Set([...Array.from(state.processedHashes), contentHash as string])
          }));
        }

        // Get existing questions to check for duplicates
        const existingQuestions = new Set(get().flashcards.map(card => card.question));
        
        // Filter out duplicate flashcards
        const uniqueFlashcards = flashcards.filter(card => !existingQuestions.has(card.question));
        
        if (uniqueFlashcards.length === 0) {
          return 0;
        }
        
        set((state) => ({
          flashcards: [
            ...state.flashcards,
            ...uniqueFlashcards.map((flashcard) => ({
              ...flashcard,
              id: crypto.randomUUID(),
              difficulty: 3, // Start at medium difficulty
              lastSeen: null,
              timesCorrect: 0,
              timesIncorrect: 0,
              // Ensure options and correctOptionIndex are set, default to empty array if not provided
              options: flashcard.options || [],
              correctOptionIndex: flashcard.correctOptionIndex ?? 0,
              sourceHash: contentHash,
            })),
          ],
        }));

        return uniqueFlashcards.length;
      },

      markCorrect: (id) => {
        set((state) => ({
          flashcards: state.flashcards.map((card) =>
            card.id === id
              ? {
                  ...card,
                  timesCorrect: card.timesCorrect + 1,
                  difficulty: Math.max(1, card.difficulty - 1), // Decrease difficulty (make it show up less often)
                  lastSeen: new Date(),
                }
              : card
          ),
        }));
      },

      markIncorrect: (id) => {
        set((state) => ({
          flashcards: state.flashcards.map((card) =>
            card.id === id
              ? {
                  ...card,
                  timesIncorrect: card.timesIncorrect + 1,
                  difficulty: Math.min(5, card.difficulty + 1), // Increase difficulty (make it show up more often)
                  lastSeen: new Date(),
                }
              : card
          ),
        }));
      },

      skipCard: (id) => {
        set((state) => ({
          skippedCards: [...state.skippedCards, id],
        }));
      },

      setIsProcessing: (isProcessing) => {
        set({ isProcessing });
      },

      setPdfContent: (content) => {
        set({ pdfContent: content });
      },

      setGeminiApiKey: (apiKey) => {
        set({ geminiApiKey: apiKey });
      },

      clearFlashcards: () => {
        set({ flashcards: [], pdfContent: null });
      },

      resetSession: () => {
        set({ skippedCards: [], sessionComplete: false });
      },

      // Algorithm to get the next card based on difficulty and when last seen
      getNextCard: () => {
        const { flashcards, skippedCards } = get();
        if (flashcards.length === 0) return null;

        // Filter out skipped cards
        const availableCards = flashcards.filter(card => !skippedCards.includes(card.id));

        if (availableCards.length === 0) {
          set({ sessionComplete: true });
          return null;
        }

        // Sort cards by:
        // 1. Cards never seen before (lastSeen is null)
        // 2. Higher difficulty (more difficult cards)
        // 3. Cards not seen for longer
        const sortedCards = [...availableCards].sort((a, b) => {
          // Ensure the lastSeen properties are proper Date objects
          const aLastSeen = ensureDate(a.lastSeen);
          const bLastSeen = ensureDate(b.lastSeen);
          
          // Priority for cards never seen before
          if (aLastSeen === null && bLastSeen !== null) return -1;
          if (aLastSeen !== null && bLastSeen === null) return 1;
          
          // Then sort by difficulty (higher difficulty first)
          if (a.difficulty !== b.difficulty) {
            return b.difficulty - a.difficulty;
          }
          
          // If both have been seen before, sort by time (older first)
          if (aLastSeen && bLastSeen) {
            return aLastSeen.getTime() - bLastSeen.getTime();
          }
          
          return 0;
        });

        return sortedCards[0] || null;
      },

      hasProcessedContent: (content) => {
        const hash = createContentHash(content);
        return get().processedHashes.has(hash);
      },
      
      getDuplicateQuestionCount: (questions) => {
        const existingQuestions = new Set(get().flashcards.map(card => card.question));
        return questions.filter(q => existingQuestions.has(q)).length;
      },
    }),
    {
      name: 'flashcards-storage',
      partialize: (state) => ({
        flashcards: state.flashcards,
        geminiApiKey: state.geminiApiKey,
        processedHashes: Array.from(state.processedHashes),
      }),
      storage: createJSONStorage(() => ({
        getItem: (name): string | null => {
          const str = localStorage.getItem(name);
          return str;
        },
        setItem: (name, value) => {
          // Need to preprocess the value before stringifying
          const valueObject = JSON.parse(value);
          
          // Handle flashcards dates
          if (valueObject.state?.flashcards?.length > 0) {
            valueObject.state.flashcards = valueObject.state.flashcards.map((card: any) => ({
              ...card,
              // No need to modify dates as they're already stringified in JSON
            }));
          }
          
          // Handle processedHashes (already converted to array by partialize)
          // No additional processing needed here
          
          // Store the processed value
          localStorage.setItem(name, JSON.stringify(valueObject));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        }
      })),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert string arrays back to Sets
          if (Array.isArray(state.processedHashes)) {
            state.processedHashes = new Set(state.processedHashes);
          }
          
          // Convert date strings back to Date objects
          if (state.flashcards) {
            state.flashcards = state.flashcards.map((card) => ({
              ...card,
              lastSeen: card.lastSeen ? new Date(card.lastSeen) : null
            }));
          }
        }
      }
    }
  )
);