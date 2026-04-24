"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFlashcardStore, Project } from "@/lib/store";
import { useSession } from "@/lib/auth/client";
import { fetchMe, type MeResponse } from "@/lib/api/me";
import {
  Card,
  CardContent,
  CardDescription,
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
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { LogoIcon } from "@/components/logo-icon";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "./ui/label";
import { BILLING_ENABLED } from "@/lib/billing";

export function ProjectList() {
  const router = useRouter();
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
  } = useFlashcardStore();
  const { data: session } = useSession();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchMe().then(setMeData).catch(() => {});
    }
  }, [session?.user]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const projectLimit = meData?.usage.limits.projects ?? Infinity;
  const projectCount = meData?.usage.projects ?? projects.length;
  const atLimit = projectLimit !== Infinity && projectCount >= projectLimit;

  const handleCreateProject = () => {
    if (!formData.name.trim()) return;
    if (atLimit) return;

    createProject(formData.name, formData.description);
    setFormData({ name: "", description: "" });
    setIsCreateDialogOpen(false);

    router.push("/app/project");
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
    router.push("/app/project");
  };

  const formatRelativeTime = (date: Date) => {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    const d = new Date(date);
    return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">My Projects</h1>

        <div className="flex items-center gap-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={atLimit} title={atLimit ? `Project limit reached (${projectLimit})` : undefined}>
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

      {/* Usage bar — only shown when logged in and plan info available */}
      {meData && projectLimit !== Infinity && (
        <div className="mb-8 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{projectCount} / {projectLimit} projects</span>
            <span className="capitalize">{meData.planTier} plan</span>
          </div>
          <Progress value={(projectCount / projectLimit) * 100} className="h-1.5" />
          {atLimit && (
            <p className="text-xs text-destructive">
              Project limit reached.{" "}
              {BILLING_ENABLED && (
                <Link href="/pricing" className="underline underline-offset-2">
                  Upgrade your plan
                </Link>
              )}
              {!BILLING_ENABLED && "Delete a project to make room."}
            </p>
          )}
        </div>
      )}

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
          <Card className="col-span-full border-dashed">
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4">
              <div className="opacity-20">
                <LogoIcon size={48} />
              </div>
              <div>
                <p className="font-semibold text-lg">No projects yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a PDF to get started — flashcards, notes, and a study guide in seconds.
                </p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Button>
            </div>
          </Card>
        ) : (
          projects.map((project) => {
            const total = project.flashcards.length;
            const mastered = project.flashcards.filter((c) => c.timesCorrect > 0).length;
            const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            return (
              <Card
                key={project.id}
                onClick={() => openProject(project)}
                className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-2">
                      <CardTitle className="truncate">{project.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteDialog(project)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pb-3 flex-1">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Updated {formatRelativeTime(project.updatedAt)}</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>
                        {total === 0
                          ? "No flashcards yet"
                          : `${mastered}/${total} cards mastered`}
                      </span>
                    </div>
                    {total > 0 && (
                      <Progress value={masteryPct} className="h-1 mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
