"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFlashcardStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Info } from "lucide-react";
import { toast } from "sonner";

export function SharedProjectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { importFromShareableLink, setActiveProject } = useFlashcardStore();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    newProjectId?: string;
    error?: string;
    processing: boolean;
  }>({
    success: false,
    processing: false,
  });

  // Check for shared project link in URL parameters
  useEffect(() => {
    const shareParam = searchParams.get("share");
    if (shareParam) {
      setShowImportDialog(true);
    }
  }, [searchParams]);

  const handleImportSharedProject = () => {
    const shareParam = searchParams.get("share");
    if (!shareParam) return;

    setImportResult({ success: false, processing: true });

    try {
      // Construct the full URL for the import function
      const currentUrl = window.location.href;
      const result = importFromShareableLink(currentUrl);

      if (result.success && result.newProjectId) {
        setImportResult({
          success: true,
          newProjectId: result.newProjectId,
          processing: false,
        });
      } else {
        setImportResult({
          success: false,
          error: result.error || "Failed to import project",
          processing: false,
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        processing: false,
      });
    }
  };

  const handleOpenImportedProject = () => {
    if (importResult.newProjectId) {
      // Set the imported project as active
      setActiveProject(importResult.newProjectId);

      // Navigate to the project page
      router.push("/project");

      // Show success toast
      toast.success("Project imported successfully!");

      // Close the dialog
      setShowImportDialog(false);
    }
  };

  const handleCloseDialog = () => {
    // Remove the share parameter from the URL to clean it up
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url.toString());

    setShowImportDialog(false);
  };

  return (
    <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Shared Project</DialogTitle>
          <DialogDescription>
            Someone has shared a flashcard project with you. Would you like to
            import it?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!importResult.processing &&
            !importResult.success &&
            !importResult.error && (
              <div className="space-y-4">
                <Alert variant="default" className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-sm text-blue-700">
                    Importing this project will create a copy for you to use and
                    modify.
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground">
                  The imported project will include all flashcards but you'll be
                  able to modify them independently.
                </p>
              </div>
            )}

          {importResult.processing && (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {importResult.success && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-sm text-green-700">
                Project imported successfully! You can now view and modify it.
              </AlertDescription>
            </Alert>
          )}

          {importResult.error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {importResult.error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!importResult.success && !importResult.processing ? (
            <>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleImportSharedProject}>
                Import Project
              </Button>
            </>
          ) : importResult.success ? (
            <Button onClick={handleOpenImportedProject}>Open Project</Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={importResult.processing}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
