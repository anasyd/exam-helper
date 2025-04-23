"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { extractTextFromPDF } from "@/lib/pdf-service";
import { Loader2, Upload, File } from "lucide-react";
import { useFlashcardStore } from "@/lib/store";
import { toast } from "sonner";

export function PdfUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setPdfContent, setIsProcessing } = useFlashcardStore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a PDF file.");
      toast.error("Invalid file type", {
        description: "Please select a PDF file.",
      });
      return;
    }

    setFile(selectedFile);
    toast.info("PDF selected", {
      description: `${selectedFile.name} (${(
        selectedFile.size /
        1024 /
        1024
      ).toFixed(2)} MB)`,
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      toast.error("No file selected", {
        description: "Please select a PDF file first.",
      });
      return;
    }

    try {
      setIsUploading(true);
      setIsProcessing(true);

      toast.loading("Processing PDF file...", {
        description: "Extracting text content from your PDF",
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);

      // Extract text from PDF
      const text = await extractTextFromPDF(file);

      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Save PDF content to store
      setPdfContent(text);

      // Show success toast
      toast.success("PDF processed successfully", {
        description:
          "Your PDF has been processed and is ready for flashcard generation.",
      });

      // Small delay to show 100% before resetting
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setIsProcessing(false);
      }, 500);
    } catch (error) {
      const errorMessage = "Failed to process the PDF file. Please try again.";
      setError(errorMessage);
      console.error("PDF upload error:", error);

      toast.error("PDF processing failed", {
        description: errorMessage,
      });

      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("File selection cleared");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            ref={fileInputRef}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
          />

          {!file && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Browse
            </Button>
          )}

          {file && !isUploading && (
            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          )}
        </div>

        {file && (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
            <File className="h-5 w-5" />
            <span className="text-sm font-medium truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-center text-sm text-muted-foreground">
              Processing PDF... {uploadProgress}%
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Process PDF"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
