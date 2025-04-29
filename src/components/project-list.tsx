"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCloudStore } from "@/lib/cloud-store";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Plus, Book, Loader2, LogOut } from "lucide-react";

export function ProjectList() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    projects,
    activeProjectId,
    setActiveProject,
    fetchProjects,
    createProject,
    deleteProject,
  } = useCloudStore();

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const loadProjects = async () => {
        setIsLoading(true);
        try {
          await fetchProjects(user.id);
        } catch (err) {
          setError("Failed to load projects. Please try again later.");
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      loadProjects();
    }
  }, [user, fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      if (user) {
        await createProject(newProjectName, newProjectDescription, user.id);
        setNewProjectName("");
        setNewProjectDescription("");
        setIsCreatingProject(false);
        router.push("/project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      await deleteProject(id);
    }
  };

  const handleOpenProject = (id: string) => {
    setActiveProject(id);
    router.push("/project");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Flashcard Projects</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsCreatingProject(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Project
          </Button>
          <Button variant="ghost" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <Book className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first flashcard project to get started
          </p>
          <Button onClick={() => setIsCreatingProject(true)}>
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenProject(project.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-2">{project.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description || "No description"}
                </p>
                <Separator className="my-3" />
                <div className="text-sm text-muted-foreground">
                  <p>{project.flashcards.length} flashcards</p>
                  <p className="text-xs">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => handleDeleteProject(project.id, e)}
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Enter project description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreatingProject(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
