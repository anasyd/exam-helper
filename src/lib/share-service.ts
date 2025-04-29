/**
 * Service for handling project sharing with short links.
 * Stores shared projects in localStorage temporarily.
 */

interface SharedProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  flashcards: {
    question: string;
    answer: string;
    options: string[];
    correctOptionIndex: number;
  }[];
  expires: number; // Timestamp when this shared project expires
}

const STORAGE_KEY = 'shared-projects';
const EXPIRATION_DAYS = 30; // Number of days before a shared project expires

/**
 * Get all shared projects from localStorage
 */
export function getSharedProjects(): Record<string, SharedProject> {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return {};
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error retrieving shared projects:', error);
    return {};
  }
}

/**
 * Save shared projects to localStorage
 */
function saveSharedProjects(projects: Record<string, SharedProject>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving shared projects:', error);
  }
}

/**
 * Generate a short unique ID for a shared project
 */
function generateShareId(): string {
  // Generate a random string of 8 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Create a shareable project and store it in localStorage
 */
export function createShareableProject(project: {
  name: string;
  description: string;
  createdAt: string;
  flashcards: { 
    question: string; 
    answer: string;
    options: string[];
    correctOptionIndex: number;
  }[];
}): string | null {
  try {
    // Clean up expired projects first
    cleanupExpiredProjects();
    
    // Generate a unique ID for this shared project
    const shareId = generateShareId();
    
    // Calculate expiration date (30 days from now)
    const expires = Date.now() + (EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    
    // Create the shared project object
    const sharedProject: SharedProject = {
      ...project,
      id: shareId,
      expires,
    };
    
    // Add it to storage
    const sharedProjects = getSharedProjects();
    sharedProjects[shareId] = sharedProject;
    saveSharedProjects(sharedProjects);
    
    return shareId;
  } catch (error) {
    console.error('Error creating shareable project:', error);
    return null;
  }
}

/**
 * Get a shared project by ID
 */
export function getSharedProject(shareId: string): SharedProject | null {
  try {
    const sharedProjects = getSharedProjects();
    const project = sharedProjects[shareId];
    
    if (!project) return null;
    
    // Check if the project has expired
    if (project.expires < Date.now()) {
      // Remove expired project and save
      delete sharedProjects[shareId];
      saveSharedProjects(sharedProjects);
      return null;
    }
    
    return project;
  } catch (error) {
    console.error('Error retrieving shared project:', error);
    return null;
  }
}

/**
 * Clean up expired shared projects
 */
export function cleanupExpiredProjects(): void {
  try {
    const now = Date.now();
    const sharedProjects = getSharedProjects();
    let hasExpired = false;
    
    // Check each project for expiration
    Object.keys(sharedProjects).forEach(id => {
      if (sharedProjects[id].expires < now) {
        delete sharedProjects[id];
        hasExpired = true;
      }
    });
    
    // Save if any projects were removed
    if (hasExpired) {
      saveSharedProjects(sharedProjects);
    }
  } catch (error) {
    console.error('Error cleaning up expired projects:', error);
  }
}