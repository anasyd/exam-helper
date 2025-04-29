"use client";

import { create } from 'zustand';
import { DatabaseService } from './db-service';
import { createShareableProject, getSharedProject } from './share-service';

// Create an instance of the database service
const dbService = new DatabaseService();

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  options: string[]; 
  correctOptionIndex: number;
  difficulty: number;
  lastSeen: Date | null;
  timesCorrect: number;
  timesIncorrect: number;
  sourceHash?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  flashcards: Flashcard[];
  pdfContent: string | null;
  processedHashes: string[];
  skippedCards: string[];
  sessionComplete: boolean;
}

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
  projects: Project[];
  activeProjectId: string | null;
  isProcessing: boolean;
  currentCardIndex: number | null; 
  geminiApiKey: string | null;

  // Project management
  createProject: (name: string, description: string, userId: string) => Promise<string>;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'flashcards' | 'processedHashes'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjects: (userId: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | null;

  // Flashcard management within active project
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>) => Promise<void>;
  addFlashcards: (flashcards: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>[], sourceContent?: string | null) => Promise<number>;
  deleteFlashcard: (id: string) => Promise<boolean>;
  markCorrect: (id: string) => Promise<void>;
  markIncorrect: (id: string) => Promise<void>;
  skipCard: (id: string) => void; 
  setIsProcessing: (isProcessing: boolean) => void;
  setPdfContent: (content: string | null) => void;
  setGeminiApiKey: (apiKey: string | null) => void;
  clearFlashcards: () => Promise<void>;
  resetSession: () => void;
  getNextCard: () => Flashcard | null;
  hasProcessedContent: (content: string) => boolean;
  getDuplicateQuestionCount: (questions: string[]) => number;
  
  // Sharing
  createShareableLink: (projectId: string) => Promise<string | null>;
  importFromShareableLink: (shareLink: string) => Promise<{ success: boolean; newProjectId?: string; error?: string }>;
}

export const useCloudStore = create<FlashcardState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  isProcessing: false,
  currentCardIndex: null,
  geminiApiKey: null,

  // Project management functions
  fetchProjects: async (userId: string) => {
    try {
      const projects = await dbService.getProjects(userId);
      set({ projects });
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  },

  createProject: async (name, description, userId) => {
    try {
      const newProject = await dbService.createProject(userId, name, description);
      set((state) => ({
        projects: [...state.projects, newProject],
        activeProjectId: newProject.id,
      }));
      return newProject.id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updatedProject = await dbService.updateProject(id, updates);
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === id ? updatedProject : project
        ),
      }));
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      await dbService.deleteProject(id);
      set((state) => {
        const newProjects = state.projects.filter((project) => project.id !== id);
        return {
          projects: newProjects,
          activeProjectId: state.activeProjectId === id ? (newProjects.length > 0 ? newProjects[0].id : null) : state.activeProjectId,
        };
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id });
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    if (!activeProjectId) return null;
    
    return projects.find((project) => project.id === activeProjectId) || null;
  },

  // Flashcard management functions
  addFlashcard: async (flashcard) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    try {
      const newFlashcard = {
        ...flashcard,
        difficulty: 3,
        lastSeen: null,
        timesCorrect: 0,
        timesIncorrect: 0,
        options: flashcard.options || [],
        correctOptionIndex: flashcard.correctOptionIndex ?? 0,
      };
      
      const addedFlashcards = await dbService.addFlashcards(activeProject.id, [newFlashcard]);
      
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                updatedAt: new Date(),
                flashcards: [...project.flashcards, addedFlashcards[0]],
              }
            : project
        ),
      }));
    } catch (error) {
      console.error('Error adding flashcard:', error);
      throw error;
    }
  },

  addFlashcards: async (flashcards, sourceContent = null) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return 0;

    let contentHash: string | undefined = undefined;
    
    // If source content is provided, create a hash for it
    if (sourceContent) {
      contentHash = createContentHash(sourceContent);
    }

    // Get existing questions to check for duplicates
    const existingQuestions = new Set(activeProject.flashcards.map(card => card.question));
    
    // Filter out duplicate flashcards
    const uniqueFlashcards = flashcards.filter(card => !existingQuestions.has(card.question));
    
    if (uniqueFlashcards.length === 0) {
      return 0;
    }
    
    try {
      const newFlashcards = uniqueFlashcards.map(card => ({
        ...card,
        difficulty: 3,
        lastSeen: null,
        timesCorrect: 0,
        timesIncorrect: 0,
        options: card.options || [],
        correctOptionIndex: card.correctOptionIndex ?? 0,
        sourceHash: contentHash,
      }));
      
      const addedFlashcards = await dbService.addFlashcards(activeProject.id, newFlashcards);
      
      set((state) => {
        let updatedProcessedHashes = [...activeProject.processedHashes];
        if (contentHash && !updatedProcessedHashes.includes(contentHash)) {
          updatedProcessedHashes.push(contentHash);
        }
        
        return {
          projects: state.projects.map((project) =>
            project.id === activeProject.id
              ? {
                  ...project,
                  updatedAt: new Date(),
                  processedHashes: updatedProcessedHashes,
                  flashcards: [
                    ...project.flashcards,
                    ...addedFlashcards,
                  ],
                }
              : project
          ),
        };
      });

      return addedFlashcards.length;
    } catch (error) {
      console.error('Error adding flashcards:', error);
      return 0;
    }
  },

  deleteFlashcard: async (id) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return false;

    try {
      await dbService.deleteFlashcard(id);
      
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                updatedAt: new Date(),
                flashcards: project.flashcards.filter((card) => card.id !== id),
              }
            : project
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      return false;
    }
  },

  markCorrect: async (id) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    const flashcard = activeProject.flashcards.find(card => card.id === id);
    if (!flashcard) return;

    try {
      const updatedCard = {
        ...flashcard,
        timesCorrect: flashcard.timesCorrect + 1,
        difficulty: Math.max(1, flashcard.difficulty - 1),
        lastSeen: new Date(),
      };
      
      await dbService.updateFlashcard(id, {
        times_correct: updatedCard.timesCorrect,
        difficulty: updatedCard.difficulty,
        last_seen: updatedCard.lastSeen?.toISOString() || null,
      });
      
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                updatedAt: new Date(),
                flashcards: project.flashcards.map((card) =>
                  card.id === id ? updatedCard : card
                ),
              }
            : project
        ),
      }));
    } catch (error) {
      console.error('Error marking flashcard as correct:', error);
    }
  },

  markIncorrect: async (id) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    const flashcard = activeProject.flashcards.find(card => card.id === id);
    if (!flashcard) return;

    try {
      const updatedCard = {
        ...flashcard,
        timesIncorrect: flashcard.timesIncorrect + 1,
        difficulty: Math.min(5, flashcard.difficulty + 1),
        lastSeen: new Date(),
      };
      
      await dbService.updateFlashcard(id, {
        times_incorrect: updatedCard.timesIncorrect,
        difficulty: updatedCard.difficulty,
        last_seen: updatedCard.lastSeen?.toISOString() || null,
      });
      
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                updatedAt: new Date(),
                flashcards: project.flashcards.map((card) =>
                  card.id === id ? updatedCard : card
                ),
              }
            : project
        ),
      }));
    } catch (error) {
      console.error('Error marking flashcard as incorrect:', error);
    }
  },

  skipCard: (id) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === activeProject.id
          ? {
              ...project,
              updatedAt: new Date(),
              skippedCards: [...project.skippedCards, id],
            }
          : project
      ),
    }));
  },

  setIsProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  setPdfContent: (content) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === activeProject.id
          ? {
              ...project,
              updatedAt: new Date(),
              pdfContent: content,
            }
          : project
      ),
    }));
  },

  setGeminiApiKey: (apiKey) => {
    set({ geminiApiKey: apiKey });
  },

  clearFlashcards: async () => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    try {
      // Delete all flashcards for this project from the database
      for (const flashcard of activeProject.flashcards) {
        await dbService.deleteFlashcard(flashcard.id);
      }
      
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                updatedAt: new Date(),
                flashcards: [],
                pdfContent: null,
              }
            : project
        ),
      }));
    } catch (error) {
      console.error('Error clearing flashcards:', error);
      throw error;
    }
  },

  resetSession: () => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return;

    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === activeProject.id
          ? {
              ...project,
              updatedAt: new Date(),
              skippedCards: [],
              sessionComplete: false,
            }
          : project
      ),
    }));
  },

  getNextCard: () => {
    const activeProject = get().getActiveProject();
    if (!activeProject || activeProject.flashcards.length === 0) return null;

    const { flashcards, skippedCards } = activeProject;

    // First try to get cards that haven't been skipped
    const availableCards = flashcards.filter(card => !skippedCards.includes(card.id));

    // If no regular cards are available but we have skipped cards, use them
    if (availableCards.length === 0) {
      // If there are skipped cards, use the first one
      if (skippedCards.length > 0) {
        const nextSkippedCardId = skippedCards[0];
        const nextCard = flashcards.find(card => card.id === nextSkippedCardId);
        
        // Remove the card from skipped cards
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === activeProject.id
              ? {
                  ...project,
                  skippedCards: project.skippedCards.slice(1),
                }
              : project
          ),
        }));
        
        return nextCard || null;
      }
      
      // If no regular cards and no skipped cards, session is complete
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                sessionComplete: true,
              }
            : project
        ),
      }));
      
      return null;
    }

    // Sort cards by priority
    const sortedCards = [...availableCards].sort((a, b) => {
      const aLastSeen = ensureDate(a.lastSeen);
      const bLastSeen = ensureDate(b.lastSeen);
      
      if (aLastSeen === null && bLastSeen !== null) return -1;
      if (aLastSeen !== null && bLastSeen === null) return 1;
      
      if (a.difficulty !== b.difficulty) {
        return b.difficulty - a.difficulty;
      }
      
      if (aLastSeen && bLastSeen) {
        return aLastSeen.getTime() - bLastSeen.getTime();
      }
      
      return 0;
    });

    return sortedCards[0] || null;
  },

  hasProcessedContent: (content) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return false;

    const hash = createContentHash(content);
    return activeProject.processedHashes.includes(hash);
  },
  
  getDuplicateQuestionCount: (questions) => {
    const activeProject = get().getActiveProject();
    if (!activeProject) return 0;

    const existingQuestions = new Set(activeProject.flashcards.map(card => card.question));
    return questions.filter(q => existingQuestions.has(q)).length;
  },

  // Sharing functionality
  createShareableLink: async (projectId) => {
    try {
      const sharedId = await dbService.shareProject(projectId);
      return `${window.location.origin}/?share=${sharedId}`;
    } catch (error) {
      console.error("Error creating shareable link:", error);
      return null;
    }
  },

  importFromShareableLink: async (shareLink) => {
    try {
      // Extract shared ID from URL
      const url = new URL(shareLink);
      const sharedId = url.searchParams.get('share');
      
      if (!sharedId) {
        throw new Error("No shared ID found in the link");
      }
      
      // Get shared project data
      const sharedProject = await dbService.getProjectBySharedId(sharedId);
      if (!sharedProject) {
        throw new Error("Shared project not found");
      }
      
      // Create a new project in the current user's account
      const { user } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in to import projects");
      }
      
      const newProjectId = await dbService.createProject(user.id, `${sharedProject.name} (Shared)`, sharedProject.description || "Imported from shared link");
      
      // Add the flashcards to the new project
      await dbService.addFlashcards(newProjectId, sharedProject.flashcards);
      
      // Fetch the updated projects list
      await get().fetchProjects(user.id);
      
      return { success: true, newProjectId };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to import from shared link' 
      };
    }
  }
}));