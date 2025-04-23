"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFlashcardStore, Project } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Edit2,
  Trash2,
  Calendar,
  BookOpen,
  MoreHorizontal,
  FolderOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "./ui/label";
import { AppSettings } from "./app-settings";

export function ProjectList() {
  const router = useRouter();
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
  } = useFlashcardStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleCreateProject = () => {
    if (!formData.name.trim()) return;

    createProject(formData.name, formData.description);
    setFormData({ name: "", description: "" });
    setIsCreateDialogOpen(false);

    // Navigate to the project page automatically
    router.push("/project");
  };

  const handleUpdateProject = () => {
    if (!currentProject || !formData.name.trim()) return;

    updateProject(currentProject.id, {
      name: formData.name,
      description: formData.description,
    });
    setFormData({ name: "", description: "" });
    setIsEditDialogOpen(false);
    setCurrentProject(null);
  };

  const handleDeleteProject = () => {
    if (!currentProject) return;

    deleteProject(currentProject.id);
    setIsDeleteDialogOpen(false);
    setCurrentProject(null);
  };

  const openEditDialog = (project: Project) => {
    setCurrentProject(project);
    setFormData({
      name: project.name,
      description: project.description,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (project: Project) => {
    setCurrentProject(project);
    setIsDeleteDialogOpen(true);
  };

  const openProject = (project: Project) => {
    setActiveProject(project.id);
    router.push("/project");
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>

        <div className="flex items-center gap-2">
          <AppSettings />

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new project to organize your flashcards.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter project description (optional)"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!formData.name.trim()}
                >
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter project description (optional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProject}
              disabled={!formData.name.trim()}
            >
              Update Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          {currentProject && (
            <div className="py-4">
              <p className="font-medium">{currentProject.name}</p>
              <p className="text-muted-foreground text-sm">
                {currentProject.description}
              </p>
              <p className="text-sm text-red-500 mt-4">
                All flashcards in this project will be permanently deleted.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <FolderOpen className="h-12 w-12 text-gray-400" />
              <CardTitle>No Projects Yet</CardTitle>
              <CardDescription>
                Create a new project to get started with organizing your
                flashcards.
              </CardDescription>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            </div>
          </Card>
        ) : (
          projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(project)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(project)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Created {formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>{project.flashcards.length} flashcards</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-1 gap-2">
                <Button onClick={() => openProject(project)} className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Open Project
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
