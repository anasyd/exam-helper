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
};

// Helper function to ensure lastSeen is a proper Date object
const ensureDate = (lastSeen: Date | string | null): Date | null => {
  if (lastSeen === null) return null;
  return lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
};

interface FlashcardState {
  flashcards: Flashcard[];
  isProcessing: boolean;
  currentCardIndex: number | null;
  pdfContent: string | null;
  geminiApiKey: string | null;
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>) => void;
  addFlashcards: (flashcards: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>[]) => void;
  markCorrect: (id: string) => void;
  markIncorrect: (id: string) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setPdfContent: (content: string | null) => void;
  setGeminiApiKey: (apiKey: string | null) => void;
  clearFlashcards: () => void;
  getNextCard: () => Flashcard | null;
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      flashcards: [],
      isProcessing: false,
      currentCardIndex: null,
      pdfContent: null,
      geminiApiKey: null,

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

      addFlashcards: (flashcards) => {
        set((state) => ({
          flashcards: [
            ...state.flashcards,
            ...flashcards.map((flashcard) => ({
              ...flashcard,
              id: crypto.randomUUID(),
              difficulty: 3, // Start at medium difficulty
              lastSeen: null,
              timesCorrect: 0,
              timesIncorrect: 0,
              // Ensure options and correctOptionIndex are set, default to empty array if not provided
              options: flashcard.options || [],
              correctOptionIndex: flashcard.correctOptionIndex ?? 0,
            })),
          ],
        }));
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

      // Algorithm to get the next card based on difficulty and when last seen
      getNextCard: () => {
        const { flashcards } = get();
        if (flashcards.length === 0) return null;

        // Sort cards by:
        // 1. Cards never seen before (lastSeen is null)
        // 2. Higher difficulty (more difficult cards)
        // 3. Cards not seen for longer
        const sortedCards = [...flashcards].sort((a, b) => {
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
      }
    }),
    {
      name: 'flashcards-storage',
      partialize: (state) => ({
        flashcards: state.flashcards,
        geminiApiKey: state.geminiApiKey,
      }),
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const parsed = JSON.parse(str);
          
          // Convert date strings back to Date objects
          if (parsed.state && parsed.state.flashcards) {
            parsed.state.flashcards = parsed.state.flashcards.map((card: any) => ({
              ...card,
              lastSeen: card.lastSeen ? new Date(card.lastSeen) : null
            }));
          }
          
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        }
      }))
    }
  )
);