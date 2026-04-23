"use client";

import { useState, useEffect, useMemo } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Flashcard } from "./flashcard";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Brain, RotateCw, BookOpen, Loader2 } from "lucide-react";
import { generateFlashcards } from "@/lib/ai/features/flashcards";
import type { RouterDependencies } from "@/lib/ai/router";

export function FlashcardSession() {
  const {
    getActiveProject,
    getNextCard,
    resetSession,
    addFlashcards,
    getDuplicateQuestionCount,
  } = useFlashcardStore();
  const providers = useFlashcardStore((s) => s.providers);
  const modelRouting = useFlashcardStore((s) => s.modelRouting);

  const routerDeps: RouterDependencies = useMemo(
    () => ({
      getSelection: (feature) =>
        modelRouting.overrides[feature] ?? modelRouting.default,
      getApiKey: (providerId) => providers[providerId].apiKey,
    }),
    [providers, modelRouting]
  );

  const activeProject = getActiveProject();
  const flashcardCount = activeProject?.flashcards.length ?? 0;

  const [currentCard, setCurrentCard] = useState<ReturnType<typeof getNextCard>>(null);
  const [generateCount, setGenerateCount] = useState(20);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  const correct = activeProject?.flashcards.reduce((s, c) => s + (c.timesCorrect || 0), 0) ?? 0;
  const incorrect = activeProject?.flashcards.reduce((s, c) => s + (c.timesIncorrect || 0), 0) ?? 0;
  const total = correct + incorrect;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Get first card when cards become available
  useEffect(() => {
    if (flashcardCount > 0 && !currentCard) {
      setCurrentCard(getNextCard());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardCount]);

  const handleNextCard = () => setCurrentCard(getNextCard());

  const handleReplay = () => {
    resetSession();
    setCurrentCard(getNextCard());
  };

  const handleGenerateMore = async () => {
    const pdfContent = activeProject?.pdfContent;
    if (!pdfContent) return;

    const defaultProviderId = modelRouting.default.providerId;
    if (!providers[defaultProviderId].apiKey) return;

    setIsGeneratingMore(true);
    try {
      const cards = await generateFlashcards(
        { kind: "text", text: pdfContent },
        generateCount,
        routerDeps
      );
      const dupes = getDuplicateQuestionCount(cards.map((c) => c.question));
      const added = addFlashcards(cards, null);
      if (added > 0) {
        setCurrentCard(getNextCard());
      }
      void dupes; // suppress unused warning — duplicate count is implicitly handled by addFlashcards
    } catch (e) {
      console.error("generate more failed:", e);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  if (!activeProject || flashcardCount === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Brain className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No flashcards yet</p>
          <p className="text-sm text-muted-foreground">
            Upload a document — flashcards will be generated automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasPdfContent = !!activeProject.pdfContent;
  const defaultProviderId = modelRouting.default.providerId;
  const hasApiKey = !!providers[defaultProviderId].apiKey;

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{flashcardCount} cards</span>
        {total > 0 && (
          <span className="text-muted-foreground">
            {accuracy}% accuracy ({correct}/{total})
          </span>
        )}
      </div>
      {total > 0 && <Progress value={accuracy} className="h-1" />}

      {currentCard ? (
        <Flashcard card={currentCard} onNext={handleNextCard} />
      ) : (
        /* Session complete */
        <Card className="w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-muted-foreground text-sm">
                {correct} correct · {incorrect} incorrect
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={handleReplay}>
              <RotateCw className="mr-2 h-4 w-4" />
              Replay session
            </Button>

            {hasPdfContent && hasApiKey && (
              <div className="w-full border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-center text-muted-foreground">
                  Generate more cards
                </p>
                <div className="flex gap-2 justify-center">
                  {[10, 20, 50].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={generateCount === n ? "default" : "outline"}
                      onClick={() => setGenerateCount(n)}
                      disabled={isGeneratingMore}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerateMore}
                  disabled={isGeneratingMore}
                >
                  {isGeneratingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Generate {generateCount} cards
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
