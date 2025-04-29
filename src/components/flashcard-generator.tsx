"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  BookOpen,
  ExternalLink,
  Save,
  AlertCircle,
} from "lucide-react";
import { useFlashcardStore } from "@/lib/store";
import { createGeminiService } from "@/lib/ai-service";
import { toast } from "sonner";

export function FlashcardGenerator() {
  const [numberOfCards, setNumberOfCards] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [forceRegenerate, setForceRegenerate] = useState<boolean>(false);
  const {
    getActiveProject,
    addFlashcards,
    setIsProcessing,
    geminiApiKey,
    hasProcessedContent,
    getDuplicateQuestionCount,
  } = useFlashcardStore();

  const activeProject = getActiveProject();

  const handleGenerate = async () => {
    if (!geminiApiKey) {
      setError("Please enter your Gemini API key in settings.");
      return;
    }

    if (!activeProject?.pdfContent) {
      setError("No PDF content available. Please upload a PDF first.");
      return;
    }

    // Check if this PDF has already been processed
    if (!forceRegenerate && hasProcessedContent(activeProject.pdfContent)) {
      toast.error("This PDF has already been processed", {
        description:
          "Use the Force Regenerate option to generate new flashcards from this PDF.",
        duration: 5000,
      });
      setError(
        "This PDF has already been processed. Enable 'Force Regenerate' if you want to generate new flashcards."
      );
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);
      setIsProcessing(true);

      // Show toast with a specific ID so we can dismiss it later
      const toastId = toast.loading(
        "Analyzing PDF content and generating flashcards..."
      );

      // Simulate initial progress
      setGenerationProgress(10);

      // Progress simulation interval
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 1000);

      // Get existing flashcards to avoid duplicates
      const existingFlashcards = activeProject.flashcards.map((card) => ({
        question: card.question,
        answer: card.answer,
      }));

      // Create Gemini service and generate flashcards with existing ones
      const geminiService = createGeminiService(geminiApiKey);
      const generatedFlashcards = await geminiService.generateFlashcards(
        activeProject.pdfContent,
        numberOfCards,
        existingFlashcards // Pass existing flashcards to avoid duplicates
      );

      // Set progress to 100%
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Check for duplicates before adding
      const duplicateCount = getDuplicateQuestionCount(
        generatedFlashcards.map((card) => card.question)
      );

      // Add generated flashcards to store, passing source content for hashing
      const addedCount = addFlashcards(
        generatedFlashcards,
        activeProject.pdfContent
      );

      // Dismiss the loading toast and show success toast
      toast.dismiss(toastId);

      if (addedCount === 0) {
        toast.error("No new flashcards generated", {
          description:
            "All generated questions are duplicates of existing flashcards.",
        });
        setError(
          "No new flashcards were added. All generated questions are duplicates."
        );
      } else if (duplicateCount > 0) {
        toast.success(`Generated ${addedCount} new flashcards!`, {
          description: `${duplicateCount} duplicate questions were skipped. Switch to the Study tab to start learning.`,
        });
      } else {
        toast.success(`Successfully generated ${addedCount} flashcards!`, {
          description: "Switch to the Study tab to start learning.",
        });
      }

      // Reset state after a brief delay to show 100%
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setIsProcessing(false);
        setForceRegenerate(false); // Reset force regenerate after successful generation
      }, 1000);
    } catch (error) {
      console.error("Error generating flashcards:", error);
      let errorMessage = "Failed to generate flashcards.";

      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          errorMessage = "Invalid Gemini API key. Please check and try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      // Dismiss any existing loading toasts and show error toast
      toast.dismiss();
      toast.error("Failed to generate flashcards", {
        description: errorMessage,
      });

      setError(errorMessage);
      setIsGenerating(false);
      setGenerationProgress(0);
      setIsProcessing(false);
    }
  };

  // Show a message about existing flashcards if we have some
  const existingCardCount = activeProject?.flashcards.length || 0;

  if (!activeProject?.pdfContent) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {existingCardCount > 0 && (
        <Alert>
          <AlertDescription className="text-sm">
            You have {existingCardCount} existing flashcards. New cards will be
            generated to avoid duplicating these questions.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <div className="text-xs text-muted-foreground space-y-2 mb-4 p-3 border rounded-md bg-muted/30">
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
          <p className="mt-2 font-medium text-amber-700">
            Your API key will only be stored locally in your browser if the
            checkbox above is checked.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="num-cards" className="block text-sm font-medium mb-1">
          Number of Flashcards
        </label>
        <Input
          id="num-cards"
          type="number"
          min={5}
          max={50}
          value={numberOfCards}
          onChange={(e) => setNumberOfCards(parseInt(e.target.value) || 20)}
          className="mb-4"
          disabled={isGenerating}
        />
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="force-regenerate"
          checked={forceRegenerate}
          onChange={(e) => setForceRegenerate(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
          disabled={isGenerating}
        />
        <label htmlFor="force-regenerate" className="text-sm font-medium">
          Force Regenerate (ignore previous processing)
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generationProgress} />
          <p className="text-center text-sm text-muted-foreground">
            Generating flashcards... {generationProgress}%
          </p>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !geminiApiKey}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Generate Flashcards
          </>
        )}
      </Button>
    </div>
  );
}
