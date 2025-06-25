"use client";

import { useState } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, Loader2, File as FileIcon, X } from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";

const ACCEPTED_FILE_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "text/plain": ".txt",
};

interface PdfUploadProps {
  onProcessingComplete: (text: string) => void;
}

export function DocumentUpload({ onProcessingComplete }: PdfUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { setPdfContent, setIsProcessing: setStoreProcessing } = // Note: setPdfContent will be renamed later
    useFlashcardStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      // Validate all selected files
      selectedFiles.forEach((file) => {
        if (ACCEPTED_FILE_TYPES[file.type as keyof typeof ACCEPTED_FILE_TYPES]) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (invalidFiles.length > 0) {
        setError(
          `Unsupported file types: ${invalidFiles.join(
            ", "
          )}. Please upload PDF, DOCX, or TXT files.`
        );
      } else {
        setError(null);
      }

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      setStoreProcessing(true);

      // Show loading toast
      const toastId = toast.loading(
        `Processing ${files.length} file(s)...`,
        {
          description: "Extracting text content from your documents",
        }
      );

      // Set initial progress
      setProcessProgress(10);

      // Client-side dynamic import
      const { extractTextFromMultipleDocuments } = await import(
        "@/lib/document-service"
      );

      // Extract text from all documents
      const { combinedText } = await extractTextFromMultipleDocuments(
        files,
        (progress) => setProcessProgress(progress)
      );

      // Update store with combined document content
      // setPdfContent(combinedText); // This will be handled by the callback prop if needed by parent

      // Call the completion callback
      onProcessingComplete(combinedText);

      // Dismiss loading toast and show success
      toast.dismiss(toastId);
      toast.success(
        `${files.length} file(s) processed and text extracted!`,
        {
          description: `Extracted ${combinedText.length} characters. Study content generation will begin next.`,
        }
      );

      // Reset progress after a brief delay to show 100%
      // The parent component will now handle the overall processing state
      setTimeout(() => {
        setIsProcessing(false);
        setProcessProgress(0);
        // setStoreProcessing(false); // Parent will manage this
      }, 1000);
    } catch (error) {
      console.error("Document upload error:", error);
      setStoreProcessing(false); // Ensure store processing is reset on error

      // Dismiss loading toast and show error
      toast.dismiss();
      toast.error("Failed to process documents", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });

      setError(
        "Failed to process the files. Please try again with different files."
      );
      setIsProcessing(false);
      setProcessProgress(0);
      setStoreProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept={Object.values(ACCEPTED_FILE_TYPES).join(",")}
          multiple
          onChange={handleFileChange}
          className="flex-1"
          disabled={isProcessing}
        />
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Process{" "}
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? "s" : ""}`
                : "Files"}
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={processProgress} />
          <p className="text-center text-sm text-muted-foreground">
            Processing documents... {processProgress}%
          </p>
        </div>
      )}

      {files.length > 0 && !isProcessing && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Selected files ({files.length}):
          </p>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeFile(file)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
