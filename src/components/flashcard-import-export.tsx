"use client";

import { useState } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Upload, AlertCircle } from "lucide-react";
import { Alert } from "./ui/alert";

export function FlashcardImportExport() {
  const { getActiveProject, exportFlashcards, importFlashcards } =
    useFlashcardStore();

  const activeProject = getActiveProject();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const handleExport = () => {
    const jsonData = exportFlashcards();

    // Create a downloadable file
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Set file name with date for better organization
    const date = new Date().toISOString().split("T")[0];
    const projectName =
      activeProject?.name.replace(/\s+/g, "_").toLowerCase() || "flashcards";
    link.download = `${projectName}_${date}.json`;
    link.href = url;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImportResult({
        success: false,
        message: "No file selected.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = importFlashcards(content);

        if (result.success) {
          setImportResult({
            success: true,
            message: `Successfully imported ${result.count} flashcards.`,
            count: result.count,
          });

          // Automatically close dialog after successful import with a short delay
          // so that the user can briefly see the success message
          setTimeout(() => {
            setImportDialogOpen(false);

            // Clear the import result after dialog closes
            setTimeout(() => {
              setImportResult(null);
            }, 300);
          }, 1500);
        } else {
          setImportResult({
            success: false,
            message: `Error importing flashcards: ${
              result.error || "Unknown error"
            }`,
          });
        }
      } catch (error) {
        setImportResult({
          success: false,
          message: `Error reading file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    };

    reader.readAsText(file);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Import/Export Flashcards</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Export your flashcards to share with others or backup your data.
          Import previously exported flashcards to restore them.
        </div>
      </CardContent>
      <CardFooter className="flex gap-4 flex-wrap">
        <Button
          onClick={handleExport}
          variant="outline"
          className="flex-1"
          disabled={activeProject?.flashcards.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export ({activeProject?.flashcards.length || 0}) Flashcards
        </Button>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              Import Flashcards
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Flashcards</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Select a JSON file containing flashcards to import.
              </p>

              {importResult && (
                <Alert
                  variant={importResult.success ? "default" : "destructive"}
                  className="my-4"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {importResult.message}
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Only .json files exported from this app are supported.
                </p>
              </div>

              <div className="mt-4">
                <Button onClick={() => setImportDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
