import { supabase, DbProject, DbFlashcard, convertDbProjectToAppProject, convertDbFlashcardToAppFlashcard, convertAppFlashcardToDbFlashcard } from './supabase';

/**
 * Database service for handling project and flashcard operations
 */
export class DatabaseService {
  /**
   * Get all projects for the current user
   */
  async getProjects(userId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // For each project, get its flashcards
      const projectsWithFlashcards = await Promise.all(data.map(async (project) => {
        const flashcards = await this.getFlashcardsForProject(project.id);
        return convertDbProjectToAppProject(project, flashcards);
      }));
      
      return projectsWithFlashcards;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  /**
   * Get flashcards for a specific project
   */
  async getFlashcardsForProject(projectId: string): Promise<DbFlashcard[]> {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching flashcards for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, name: string, description: string) {
    try {
      const now = new Date();
      const newProject: Partial<DbProject> = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        description,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();
      
      if (error) throw error;
      
      return convertDbProjectToAppProject(data);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, updates: Partial<{name: string, description: string}>) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Get the flashcards for this project
      const flashcards = await this.getFlashcardsForProject(projectId);
      
      return convertDbProjectToAppProject(data, flashcards);
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project and all its flashcards
   */
  async deleteProject(projectId: string) {
    try {
      // Delete all flashcards first (foreign key constraint)
      await supabase
        .from('flashcards')
        .delete()
        .eq('project_id', projectId);
      
      // Then delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple flashcards to a project
   */
  async addFlashcards(projectId: string, flashcards: any[]) {
    try {
      // Convert app flashcards to DB format
      const dbFlashcards = flashcards.map(card => ({
        ...convertAppFlashcardToDbFlashcard(card, projectId),
        id: crypto.randomUUID() // Generate new IDs
      }));
      
      // Insert all flashcards
      const { data, error } = await supabase
        .from('flashcards')
        .insert(dbFlashcards)
        .select();
      
      if (error) throw error;
      
      // Update the project's updated_at timestamp
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);
      
      return data.map(convertDbFlashcardToAppFlashcard);
    } catch (error) {
      console.error(`Error adding flashcards to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a flashcard
   */
  async deleteFlashcard(flashcardId: string) {
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', flashcardId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting flashcard ${flashcardId}:`, error);
      throw error;
    }
  }

  /**
   * Update a flashcard
   */
  async updateFlashcard(flashcardId: string, updates: Partial<DbFlashcard>) {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .update(updates)
        .eq('id', flashcardId)
        .select()
        .single();
      
      if (error) throw error;
      
      return convertDbFlashcardToAppFlashcard(data);
    } catch (error) {
      console.error(`Error updating flashcard ${flashcardId}:`, error);
      throw error;
    }
  }

  /**
   * Share a project by creating a shared_id
   */
  async shareProject(projectId: string) {
    try {
      // Generate a random shared ID
      const sharedId = Math.random().toString(36).substring(2, 10);
      
      // Update the project with the shared ID
      const { error } = await supabase
        .from('projects')
        .update({ shared_id: sharedId })
        .eq('id', projectId);
      
      if (error) throw error;
      
      return sharedId;
    } catch (error) {
      console.error(`Error sharing project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get a project by its shared ID
   */
  async getProjectBySharedId(sharedId: string) {
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('shared_id', sharedId)
        .single();
      
      if (projectError) throw projectError;
      
      // Get the flashcards for this project
      const { data: flashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('project_id', project.id);
      
      if (flashcardsError) throw flashcardsError;
      
      return convertDbProjectToAppProject(project, flashcards);
    } catch (error) {
      console.error(`Error fetching project by shared ID ${sharedId}:`, error);
      return null;
    }
  }
}