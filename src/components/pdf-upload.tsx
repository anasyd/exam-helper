"use client";

import { useState } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractTextFromPDF } from "@/lib/pdf-service";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PdfUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { setPdfContent, setIsProcessing: setStoreProcessing } =
    useFlashcardStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      // Validate that it's a PDF
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a valid PDF file.");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      setStoreProcessing(true);

      // Show loading toast
      const toastId = toast.loading("Processing PDF file...", {
        description: "Extracting text content from your PDF",
      });

      // Simulate initial progress
      setProcessProgress(10);

      // Progress simulation interval
      const progressInterval = setInterval(() => {
        setProcessProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Extract text from PDF
      const content = await extractTextFromPDF(file);

      // Set progress to 100%
      clearInterval(progressInterval);
      setProcessProgress(100);

      // Update store with PDF content
      setPdfContent(content);

      // Dismiss loading toast and show success
      toast.dismiss(toastId);
      toast.success("PDF processed successfully!", {
        description: `Extracted ${content.length} characters of text.`,
      });

      // Reset progress after a brief delay to show 100%
      setTimeout(() => {
        setIsProcessing(false);
        setProcessProgress(0);
        setStoreProcessing(false);
      }, 1000);
    } catch (error) {
      console.error("PDF upload error:", error);

      // Dismiss loading toast and show error
      toast.dismiss();
      toast.error("Failed to process PDF", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });

      setError("Failed to process the PDF file. Please try another file.");
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
          accept=".pdf"
          onChange={handleFileChange}
          className="flex-1"
          disabled={isProcessing}
        />
        <Button onClick={handleUpload} disabled={!file || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Process PDF
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
            Processing PDF... {processProgress}%
          </p>
        </div>
      )}

      {file && !isProcessing && (
        <p className="text-sm">
          Selected file: <span className="font-medium">{file.name}</span> (
          {(file.size / 1024).toFixed(1)} KB)
        </p>
      )}
    </div>
  );
}
