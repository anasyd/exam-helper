import { useState, useEffect, useRef } from "react"; // Added useRef
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings,
  Save,
  ExternalLink,
  Check,
  Upload,
  Download,
  // Gamepad2, // Reverted
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
// import { Switch } from "@/components/ui/switch"; // Reverted

export function AppSettings() {
  const {
    geminiApiKey,
    setGeminiApiKey,
    exportAllProjects,
    importProjects,
    projects,
    // gamificationEnabled,     // Reverted
    // setGamificationEnabled, // Reverted
  } = useFlashcardStore();
  const [apiKey, setApiKey] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // const [localGamificationEnabled, setLocalGamificationEnabled] = useState(gamificationEnabled); // Reverted
  const [isSaved, setIsSaved] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (geminiApiKey) {
      setApiKey(geminiApiKey);
    }
  }, [geminiApiKey]);

  // Re-sync local state if dialog is reopened and global state changed
  useEffect(() => {
    if (isDialogOpen) {
      // setLocalGamificationEnabled(gamificationEnabled); // Reverted
    }
  }, [isDialogOpen /*, gamificationEnabled Reverted */]);


  const handleSaveSettings = () => {
    // Save API Key
    setGeminiApiKey(apiKey);

    // // Save Gamification Setting - Reverted
    // if (setGamificationEnabled) { // Check if function exists
    //   setGamificationEnabled(localGamificationEnabled);
    // }

    setIsSaved(true);
    toast.success("Settings saved successfully!");
    setTimeout(() => setIsSaved(false), 3000);
    // setIsDialogOpen(false); // Optionally close dialog on save
  };

  const handleClearApiKey = () => {
    setApiKey("");
    setGeminiApiKey(null);
    toast.info("API key removed", {
      description: "Your Gemini API key has been cleared.",
    });
  };

  // --- Import/Export Handlers ---

  const handleExportAll = () => {
    if (projects.length === 0) {
      toast.info("No projects to export.");
      return;
    }
    try {
      const jsonData = exportAllProjects();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `flashcard_projects_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("All projects exported successfully.");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export projects.", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click(); // Trigger hidden file input
  };

  const handleImportFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error("File content is empty.");
        }
        const result = importProjects(content); // Use importProjects for multi-project import

        if (result.success) {
          toast.success(`${result.count} project(s) imported successfully.`);
          // Optionally, you might want to navigate the user or refresh the view
        } else {
          throw new Error(result.error || "Import failed.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        toast.error("Failed to import projects.", {
          description:
            error instanceof Error
              ? error.message
              : "Invalid file format or content.",
        });
      } finally {
        // Reset file input value to allow importing the same file again if needed
        if (importFileInputRef.current) {
          importFileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the import file.");
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // --- End Import/Export Handlers ---

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {/* ... DialogTrigger ... */}
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Configure global settings and manage project data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Key Section */}
          <div className="space-y-2">
            {/* ... existing API key input and description ... */}
            <Label htmlFor="api-key" className="font-medium">
              Gemini API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              This API key will be stored locally in your browser and used for
              all flashcard generation.
            </p>

            <div className="text-xs text-muted-foreground space-y-2 mt-4 p-3 border rounded-md bg-muted/30">
              <p className="font-medium">How to get your API key:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Visit{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 inline-flex items-center"
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </li>
                <li>Create or sign in to your Google account</li>
                <li>Go to the API Keys section</li>
                <li>Create a new API key and copy it</li>
              </ol>
            </div>
          </div>

          <Separator />

          {/* Import/Export Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Project Data Management</h3>
            <p className="text-sm text-muted-foreground">
              Export all your projects into a single backup file, or import
              projects from a previously exported file. Importing a file with a
              single project will create a new project.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportAll}
                disabled={projects.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export All Projects
              </Button>
              <Button variant="outline" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Import Projects
              </Button>
              {/* Hidden file input */}
              <input
                type="file"
                ref={importFileInputRef}
                onChange={handleImportFileChange}
                accept=".json"
                style={{ display: "none" }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          {/* API Key Buttons on one side */}
          <div className="flex gap-2 justify-end flex-grow">
            <Button
              variant="outline"
              onClick={handleClearApiKey}
              disabled={!apiKey}
            >
              Clear API Key
            </Button>
            <Button onClick={handleSaveApiKey} disabled={!apiKey || isSaved}>
              {isSaved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save API Key
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
