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
  RotateCw,
  Layers,
} from "lucide-react";
import { useFlashcardStore } from "@/lib/store";
import { createGeminiService } from "@/lib/ai-service";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FlashcardGenerator() {
  // Basic state
  const [numberOfCards, setNumberOfCards] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [forceRegenerate, setForceRegenerate] = useState<boolean>(false);

  // Batch generation state
  const [totalCards, setTotalCards] = useState<number>(100);
  const [batchSize, setBatchSize] = useState<number>(20);
  const [currentBatch, setCurrentBatch] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);

  // Content splitting state
  const [splitContent, setSplitContent] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [totalSections, setTotalSections] = useState<number>(0);

  const {
    getActiveProject,
    addFlashcards,
    setIsProcessing,
    geminiApiKey,
    hasProcessedContent,
    getDuplicateQuestionCount,
  } = useFlashcardStore();

  const activeProject = getActiveProject();

  // Split content into manageable chunks
  const splitContentIntoChunks = (
    content: string,
    chunkSize: number = 25000
  ): string[] => {
    if (!content) return [];

    // Simple splitting by approximate character count
    const chunks: string[] = [];
    const paragraphs = content.split("\n");
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += "\n" + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  const handleBatchedGenerate = async () => {
    if (!geminiApiKey || !activeProject?.pdfContent) {
      setError("API key or PDF content missing");
      return;
    }

    // Initialize batch generation
    setIsGenerating(true);
    setIsProcessing(true);
    setError(null);

    // Calculate total batches
    const sections = splitContent
      ? splitContentIntoChunks(activeProject.pdfContent)
      : [activeProject.pdfContent];
    setTotalSections(sections.length);

    const calculatedBatchSize = Math.min(50, batchSize);
    const batchesPerSection = Math.ceil(totalCards / calculatedBatchSize);
    const totalBatchesToProcess = sections.length * batchesPerSection;

    setTotalBatches(totalBatchesToProcess);
    setCurrentBatch(0);
    setCurrentSection(0);

    // Global tracking
    let totalCardsGenerated = 0;
    let totalDuplicates = 0;

    // Show initial toast
    const toastId = toast.loading(
      `Starting batch generation of ${totalCards} flashcards...`
    );

    try {
      for (
        let sectionIndex = 0;
        sectionIndex < sections.length;
        sectionIndex++
      ) {
        setCurrentSection(sectionIndex + 1);
        const sectionContent = sections[sectionIndex];

        // Get existing flashcards to avoid duplicates
        const existingFlashcards = activeProject.flashcards.map((card) => ({
          question: card.question,
          answer: card.answer,
        }));

        // Create the service instance
        const geminiService = createGeminiService(geminiApiKey);

        // Calculate how many cards to generate in each batch for this section
        const cardsPerBatch = calculatedBatchSize;
        const batchesNeeded = Math.ceil(
          totalCards / sections.length / cardsPerBatch
        );

        for (let batchIndex = 0; batchIndex < batchesNeeded; batchIndex++) {
          // Update batch counter
          const currentBatchNumber =
            sectionIndex * batchesNeeded + batchIndex + 1;
          setCurrentBatch(currentBatchNumber);

          // Calculate overall progress
          const overallProgress = Math.round(
            (currentBatchNumber / totalBatchesToProcess) * 100
          );
          setGenerationProgress(overallProgress);

          // Update toast
          toast.loading(
            `Processing batch ${currentBatchNumber}/${totalBatchesToProcess}...`,
            { id: toastId }
          );

          try {
            // Generate flashcards for this batch
            const generatedFlashcards = await geminiService.generateFlashcards(
              sectionContent,
              cardsPerBatch,
              existingFlashcards
            );

            // Check for duplicates and add to store
            const duplicateCount = getDuplicateQuestionCount(
              generatedFlashcards.map((card) => card.question)
            );

            // Add new cards to the store
            const addedCount = addFlashcards(
              generatedFlashcards,
              forceRegenerate ? null : sectionContent
            );

            // Update tracking
            totalCardsGenerated += addedCount;
            totalDuplicates += duplicateCount;

            // Update existing flashcards to avoid duplicates in subsequent batches
            existingFlashcards.push(
              ...generatedFlashcards.map((card) => ({
                question: card.question,
                answer: card.answer,
              }))
            );

            // Short pause to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (batchError) {
            console.error(`Error in batch ${currentBatchNumber}:`, batchError);
            // Continue to the next batch even if this one failed
          }
        }
      }

      // All batches completed
      setGenerationProgress(100);

      // Show completion toast
      toast.dismiss(toastId);
      if (totalCardsGenerated > 0) {
        toast.success(`Generated ${totalCardsGenerated} flashcards!`, {
          description: `${totalDuplicates} duplicate questions were skipped. Switch to the Study tab to start learning.`,
        });
      } else {
        toast.error("No new flashcards generated", {
          description:
            "All generated questions were duplicates of existing flashcards.",
        });
      }
    } catch (error) {
      console.error("Error in batch generation:", error);
      toast.dismiss(toastId);
      toast.error("Failed during batch generation", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setError(
        "Failed during batch generation. Some cards may have been created."
      );
    } finally {
      // Reset state after completion
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleGenerate = async () => {
    // If in batch mode, use the batch generation
    if (isBatchMode) {
      handleBatchedGenerate();
      return;
    }

    // Original generation code for single batch
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

  // Calculate estimated batches for UI display
  const calculateEstimatedBatches = () => {
    if (!splitContent) return Math.ceil(totalCards / batchSize);
    // Rough estimate assuming 25k chars per section with average PDF size of 200k
    const estimatedSections = activeProject?.pdfContent
      ? Math.ceil(activeProject.pdfContent.length / 25000)
      : 1;
    return (
      estimatedSections * Math.ceil(totalCards / batchSize / estimatedSections)
    );
  };

  // Show a message about existing flashcards if we have some
  const existingCardCount = activeProject?.flashcards.length || 0;
  const estimatedBatches = calculateEstimatedBatches();

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

      <Tabs
        defaultValue="basic"
        onValueChange={(val) => setIsBatchMode(val === "advanced")}
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced (Batch)</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div>
            <label
              htmlFor="num-cards"
              className="block text-sm font-medium mb-1"
            >
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
        </TabsContent>

        <TabsContent value="advanced">
          <div className="space-y-4">
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-xs text-blue-700">
                Batch mode generates large numbers of flashcards in smaller
                chunks, which helps avoid AI limits and ensures better quality.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label
                htmlFor="total-cards"
                className="block text-sm font-medium"
              >
                Total Flashcards to Generate
              </label>
              <Input
                id="total-cards"
                type="number"
                min={10}
                max={500}
                value={totalCards}
                onChange={(e) => setTotalCards(parseInt(e.target.value) || 100)}
                className="mb-1"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Total number of flashcards you want to create (up to 500)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="batch-size" className="block text-sm font-medium">
                Cards per Batch
              </label>
              <Input
                id="batch-size"
                type="number"
                min={5}
                max={50}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 20)}
                className="mb-1"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                How many cards to generate at once (max 50 per batch)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="split-content"
                checked={splitContent}
                onCheckedChange={(checked) => setSplitContent(checked === true)}
                disabled={isGenerating}
              />
              <label
                htmlFor="split-content"
                className="text-sm font-medium flex items-center"
              >
                <Layers className="h-4 w-4 mr-1 text-muted-foreground" />
                Split large PDFs into sections
              </label>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Estimated batches:{" "}
              <span className="font-medium">{estimatedBatches}</span>
              {splitContent &&
                activeProject?.pdfContent &&
                ` across ~${Math.ceil(
                  activeProject.pdfContent.length / 25000
                )} content sections`}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="force-regenerate"
          checked={forceRegenerate}
          onCheckedChange={(checked) => setForceRegenerate(checked === true)}
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
            {isBatchMode
              ? `Generating batch ${currentBatch}/${
                  totalBatches || "?"
                } - ${generationProgress}%`
              : `Generating flashcards... ${generationProgress}%`}
          </p>
          {isBatchMode && splitContent && totalSections > 1 && (
            <p className="text-center text-xs text-muted-foreground">
              Processing section {currentSection}/{totalSections}
            </p>
          )}
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
            {isBatchMode ? `Processing Batches...` : `Generating...`}
          </>
        ) : (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            {isBatchMode
              ? `Generate ${totalCards} Flashcards in Batches`
              : `Generate ${numberOfCards} Flashcards`}
          </>
        )}
      </Button>
    </div>
  );
}
