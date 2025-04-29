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

// Project type definition
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
  createProject: (name: string, description: string) => string;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'flashcards' | 'processedHashes'>>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | null;

  // Flashcard management within active project
  addFlashcard: (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>) => void;
  addFlashcards: (flashcards: Omit<Flashcard, 'id' | 'difficulty' | 'lastSeen' | 'timesCorrect' | 'timesIncorrect'>[], sourceContent?: string | null) => number;
  deleteFlashcard: (id: string) => boolean;
  markCorrect: (id: string) => void;
  markIncorrect: (id: string) => void;
  skipCard: (id: string) => void; 
  setIsProcessing: (isProcessing: boolean) => void;
  setPdfContent: (content: string | null) => void;
  setGeminiApiKey: (apiKey: string | null) => void;
  clearFlashcards: () => void;
  resetSession: () => void;
  getNextCard: () => Flashcard | null;
  hasProcessedContent: (content: string) => boolean;
  getDuplicateQuestionCount: (questions: string[]) => number;
  
  // Import/Export
  exportFlashcards: (projectId?: string) => string;
  importFlashcards: (jsonData: string, projectId?: string) => { success: boolean; count: number; error?: string };
  exportProject: (projectId: string) => string | null; 
  importProject: (jsonData: string) => { success: boolean; newProjectId?: string; error?: string }; 
  exportAllProjects: () => string; 
  importProjects: (jsonData: string) => { success: boolean; count: number; error?: string };
  
  // Sharing
  createShareableLink: (projectId: string) => string | null;
  importFromShareableLink: (shareLink: string) => { success: boolean; newProjectId?: string; error?: string };
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      isProcessing: false,
      currentCardIndex: null,
      geminiApiKey: null,

      // Project management functions
      createProject: (name, description) => {
        const id = crypto.randomUUID();
        const now = new Date();
        
        set((state) => ({
          projects: [
            ...state.projects,
            {
              id,
              name,
              description,
              createdAt: now,
              updatedAt: now,
              flashcards: [],
              pdfContent: null,
              processedHashes: [],
              skippedCards: [],
              sessionComplete: false,
            }
          ],
          activeProjectId: id, // Set newly created project as active
        }));
        
        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? {
                  ...project,
                  ...updates,
                  updatedAt: new Date(),
                }
              : project
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => {
          const newProjects = state.projects.filter((project) => project.id !== id);
          return {
            projects: newProjects,
            // If the deleted project was active, clear active project
            activeProjectId: state.activeProjectId === id ? (newProjects.length > 0 ? newProjects[0].id : null) : state.activeProjectId,
          };
        });
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
      addFlashcard: (flashcard) => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return;

        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === activeProject.id
              ? {
                  ...project,
                  updatedAt: new Date(),
                  flashcards: [
                    ...project.flashcards,
                    {
                      ...flashcard,
                      id: crypto.randomUUID(),
                      difficulty: 3, // Start at medium difficulty
                      lastSeen: null,
                      timesCorrect: 0,
                      timesIncorrect: 0,
                      options: flashcard.options || [],
                      correctOptionIndex: flashcard.correctOptionIndex ?? 0,
                    },
                  ],
                }
              : project
          ),
        }));
      },

      addFlashcards: (flashcards, sourceContent = null) => {
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
                      ...uniqueFlashcards.map((flashcard) => ({
                        ...flashcard,
                        id: crypto.randomUUID(),
                        difficulty: 3,
                        lastSeen: null,
                        timesCorrect: 0,
                        timesIncorrect: 0,
                        options: flashcard.options || [],
                        correctOptionIndex: flashcard.correctOptionIndex ?? 0,
                        sourceHash: contentHash,
                      })),
                    ],
                  }
                : project
            ),
          };
        });

        return uniqueFlashcards.length;
      },

      deleteFlashcard: (id) => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return false;

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
      },

      markCorrect: (id) => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return;

        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === activeProject.id
              ? {
                  ...project,
                  updatedAt: new Date(),
                  flashcards: project.flashcards.map((card) =>
                    card.id === id
                      ? {
                          ...card,
                          timesCorrect: card.timesCorrect + 1,
                          difficulty: Math.max(1, card.difficulty - 1),
                          lastSeen: new Date(),
                        }
                      : card
                  ),
                }
              : project
          ),
        }));
      },

      markIncorrect: (id) => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return;

        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === activeProject.id
              ? {
                  ...project,
                  updatedAt: new Date(),
                  flashcards: project.flashcards.map((card) =>
                    card.id === id
                      ? {
                          ...card,
                          timesIncorrect: card.timesIncorrect + 1,
                          difficulty: Math.min(5, card.difficulty + 1),
                          lastSeen: new Date(),
                        }
                      : card
                  ),
                }
              : project
          ),
        }));
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

      clearFlashcards: () => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return;

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

      exportFlashcards: (projectId) => {
        const id = projectId || get().activeProjectId;
        if (!id) return '[]';
        
        const project = get().projects.find(p => p.id === id);
        if (!project) return '[]';
        
        return JSON.stringify(project.flashcards);
      },

      importFlashcards: (jsonData, projectId) => {
        try {
          const id = projectId || get().activeProjectId;
          if (!id) {
            return { success: false, count: 0, error: 'No active project selected' };
          }
          
          const project = get().projects.find(p => p.id === id);
          if (!project) {
            return { success: false, count: 0, error: 'Project not found' };
          }

          const importedFlashcards: Flashcard[] = JSON.parse(jsonData);
          if (!Array.isArray(importedFlashcards)) {
            throw new Error("Invalid data format");
          }

          const existingQuestions = new Set(project.flashcards.map(card => card.question));
          const uniqueFlashcards = importedFlashcards.filter(card => !existingQuestions.has(card.question));

          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id
                ? {
                    ...p,
                    updatedAt: new Date(),
                    flashcards: [
                      ...p.flashcards,
                      ...uniqueFlashcards.map((flashcard) => ({
                        ...flashcard,
                        id: crypto.randomUUID(),
                        lastSeen: flashcard.lastSeen ? new Date(flashcard.lastSeen) : null,
                      })),
                    ],
                  }
                : p
            ),
          }));

          return { success: true, count: uniqueFlashcards.length };
        } catch (error) {
          return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },

      exportProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return null;
        // Serialize the project, converting dates to ISO strings
        const projectToExport = {
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          flashcards: project.flashcards.map(card => ({
            ...card,
            lastSeen: card.lastSeen ? card.lastSeen.toISOString() : null,
          })),
        };
        return JSON.stringify(projectToExport);
      },

      importProject: (jsonData) => {
        try {
          const importedProjectData = JSON.parse(jsonData);
          
          // Basic validation (can be more thorough)
          if (!importedProjectData || typeof importedProjectData !== 'object' || !importedProjectData.name || !Array.isArray(importedProjectData.flashcards)) {
            throw new Error("Invalid project data format");
          }

          const newProjectId = crypto.randomUUID();
          const now = new Date();

          const newProject: Project = {
            ...importedProjectData,
            id: newProjectId, // Assign a new ID
            createdAt: importedProjectData.createdAt ? new Date(importedProjectData.createdAt) : now, // Restore or set date
            updatedAt: now, // Set updated time to now
            // Ensure flashcards have new IDs and correct date formats
            flashcards: importedProjectData.flashcards.map((card: any) => ({
              ...card,
              id: crypto.randomUUID(), // Assign new ID to each flashcard
              lastSeen: card.lastSeen ? new Date(card.lastSeen) : null,
              // Reset stats or keep them? Let's reset for a fresh start
              timesCorrect: card.timesCorrect || 0,
              timesIncorrect: card.timesIncorrect || 0,
              difficulty: card.difficulty || 3,
            })),
            // Reset session-specific data
            skippedCards: [],
            sessionComplete: false,
          };

          set((state) => ({
            projects: [...state.projects, newProject],
          }));

          return { success: true, newProjectId: newProjectId };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Failed to import project' };
        }
      },

      exportAllProjects: () => {
        const projectsToExport = get().projects.map(project => ({
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          flashcards: project.flashcards.map(card => ({
            ...card,
            lastSeen: card.lastSeen ? card.lastSeen.toISOString() : null,
          })),
        }));
        return JSON.stringify(projectsToExport);
      },

      importProjects: (jsonData) => {
        try {
          const importedProjectsData: any[] = JSON.parse(jsonData);
          if (!Array.isArray(importedProjectsData)) {
            throw new Error("Invalid data format: Expected an array of projects.");
          }

          const existingProjectIds = new Set(get().projects.map(p => p.id));
          let importedCount = 0;
          const projectsToAdd: Project[] = [];

          for (const projectData of importedProjectsData) {
            // Basic validation
            if (!projectData || typeof projectData !== 'object' || !projectData.name || !Array.isArray(projectData.flashcards)) {
              console.warn("Skipping invalid project data during import:", projectData);
              continue; // Skip invalid entries
            }

            const newProjectId = existingProjectIds.has(projectData.id) ? crypto.randomUUID() : projectData.id || crypto.randomUUID();
            const now = new Date();

            const newProject: Project = {
              ...projectData,
              id: newProjectId,
              createdAt: projectData.createdAt ? new Date(projectData.createdAt) : now,
              updatedAt: projectData.updatedAt ? new Date(projectData.updatedAt) : now,
              flashcards: projectData.flashcards.map((card: any) => ({
                ...card,
                id: card.id && !existingProjectIds.has(projectData.id) ? card.id : crypto.randomUUID(), // Keep card ID if project ID is new, else generate new
                lastSeen: card.lastSeen ? new Date(card.lastSeen) : null,
                timesCorrect: card.timesCorrect || 0,
                timesIncorrect: card.timesIncorrect || 0,
                difficulty: card.difficulty || 3,
              })),
              skippedCards: projectData.skippedCards || [],
              sessionComplete: projectData.sessionComplete || false,
            };
            projectsToAdd.push(newProject);
            importedCount++;
          }

          set((state) => ({
            projects: [...state.projects, ...projectsToAdd],
          }));

          return { success: true, count: importedCount };
        } catch (error) {
          return { success: false, count: 0, error: error instanceof Error ? error.message : 'Failed to import projects' };
        }
      },

      // Sharing functionality
      createShareableLink: (projectId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return null;

        // Create shareable project - we'll strip PDF content to reduce URL size
        // and only include essential data for sharing
        const shareableProject = {
          name: project.name,
          description: project.description,
          createdAt: project.createdAt.toISOString(),
          flashcards: project.flashcards.map(card => ({
            question: card.question,
            answer: card.answer,
            options: card.options,
            correctOptionIndex: card.correctOptionIndex
          }))
        };

        // Encode project data
        try {
          // Convert to JSON first
          const jsonData = JSON.stringify(shareableProject);
          // Use base64 encoding to make it URL-safe
          const encodedData = btoa(jsonData);
          // Create shareable link - assumes app is deployed at root
          const shareLink = `${window.location.origin}/?share=${encodedData}`;
          return shareLink;
        } catch (error) {
          console.error("Error creating shareable link:", error);
          return null;
        }
      },

      importFromShareableLink: (shareLink) => {
        try {
          // Extract shared data from URL
          const url = new URL(shareLink);
          const encodedData = url.searchParams.get('share');
          
          if (!encodedData) {
            throw new Error("No shared data found in the link");
          }
          
          // Decode the data
          const jsonData = atob(encodedData);
          const sharedProject = JSON.parse(jsonData);
          
          // Basic validation
          if (!sharedProject || !sharedProject.name || !Array.isArray(sharedProject.flashcards)) {
            throw new Error("Invalid shared project data");
          }
          
          // Create a new project from the shared data
          const newProjectId = crypto.randomUUID();
          const now = new Date();
          
          const newProject: Project = {
            id: newProjectId,
            name: `${sharedProject.name} (Shared)`,
            description: sharedProject.description || "Imported from shared link",
            createdAt: now,
            updatedAt: now,
            flashcards: sharedProject.flashcards.map((card: any) => ({
              ...card,
              id: crypto.randomUUID(),
              difficulty: 3,
              lastSeen: null,
              timesCorrect: 0,
              timesIncorrect: 0
            })),
            pdfContent: null,
            processedHashes: [],
            skippedCards: [],
            sessionComplete: false
          };
          
          set((state) => ({
            projects: [...state.projects, newProject],
          }));
          
          return { success: true, newProjectId };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to import from shared link' 
          };
        }
      }
    }),
    {
      name: 'flashcards-storage-v2',
      partialize: (state) => ({
        projects: state.projects.map(project => ({
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          flashcards: project.flashcards.map(card => ({
            ...card,
            lastSeen: card.lastSeen ? card.lastSeen.toISOString() : null,
          })),
        })),
        activeProjectId: state.activeProjectId,
        geminiApiKey: state.geminiApiKey,
      }),
      storage: createJSONStorage(() => ({
        getItem: (name): string | null => {
          return localStorage.getItem(name);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, value);
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        }
      })),
      onRehydrateStorage: () => (state) => {
        if (state && state.projects) {
          // Convert date strings back to Date objects
          state.projects = state.projects.map(project => ({
            ...project,
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
            flashcards: project.flashcards.map(card => ({
              ...card,
              lastSeen: card.lastSeen ? new Date(card.lastSeen) : null,
            })),
          }));
        }
      }
    }
  )
);