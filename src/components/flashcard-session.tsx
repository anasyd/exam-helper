"use client";

import { useState, useEffect } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Flashcard } from "./flashcard";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Brain, BarChart2, RotateCw } from "lucide-react";

export function FlashcardSession() {
  const {
    flashcards,
    getNextCard,
    resetSession,
    sessionComplete,
    skippedCards,
  } = useFlashcardStore();
  const [currentCard, setCurrentCard] = useState(getNextCard());
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
  });

  // Update stats when flashcards change
  useEffect(() => {
    if (flashcards.length > 0) {
      const correct = flashcards.reduce(
        (sum, card) => sum + card.timesCorrect,
        0
      );
      const incorrect = flashcards.reduce(
        (sum, card) => sum + card.timesIncorrect,
        0
      );
      setSessionStats({
        cardsStudied: correct + incorrect,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
      });
    }
  }, [flashcards]);

  const handleNextCard = () => {
    setCurrentCard(getNextCard());
  };

  const handleRestartSession = () => {
    resetSession();
    setCurrentCard(getNextCard());
  };

  if (flashcards.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>No Flashcards Yet</CardTitle>
          <CardDescription>
            Upload a PDF and generate flashcards to start studying.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-center">
            <h4 className="text-sm font-medium text-muted-foreground">Cards</h4>
            <p className="text-2xl font-bold">{flashcards.length}</p>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <h4 className="text-sm font-medium text-green-600">Correct</h4>
            <p className="text-2xl font-bold">{sessionStats.correctAnswers}</p>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <h4 className="text-sm font-medium text-red-600">Incorrect</h4>
            <p className="text-2xl font-bold">
              {sessionStats.incorrectAnswers}
            </p>
          </div>
        </Card>
      </div>

      {skippedCards.length > 0 && (
        <Card className="p-3">
          <div className="text-center">
            <h4 className="text-sm font-medium text-amber-600">Skipped</h4>
            <p className="text-2xl font-bold">{skippedCards.length}</p>
          </div>
        </Card>
      )}

      {currentCard ? (
        <Flashcard card={currentCard} onNext={handleNextCard} />
      ) : (
        <Card className="w-full">
          <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="font-semibold text-xl">All Caught Up!</h3>
              <p className="text-muted-foreground">
                {sessionComplete && skippedCards.length > 0
                  ? `You've reviewed all your flashcards, including ${skippedCards.length} skipped cards.`
                  : "You've reviewed all your flashcards for now."}
              </p>
            </div>
            <Button onClick={handleRestartSession} className="mt-4">
              <RotateCw className="mr-2 h-4 w-4" />
              {sessionComplete ? "Restart Session" : "Review Again"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
