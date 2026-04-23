"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import {
  useFlashcardStore,
  type Flashcard as FlashcardType,
} from "@/lib/store";
import { cn, calculateCardScore } from "@/lib/utils";

interface FlashcardProps {
  card: FlashcardType;
  onNext: () => void;
}

const shuffleArray = <T,>(array: T[]): [T[], number[]] => {
  const shuffled = [...array];
  const indices = array.map((_, i) => i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [shuffled, indices];
};

export function Flashcard({ card, onNext }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [originalIndices, setOriginalIndices] = useState<number[]>([]);
  const { markCorrect, markIncorrect, skipCard } = useFlashcardStore();

  useEffect(() => {
    const originalOptions =
      card.options && card.options.length === 4
        ? card.options
        : ["Option A", "Option B", "Option C", "Option D"];
    const [shuffled, indices] = shuffleArray(originalOptions);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShuffledOptions(shuffled);
    setOriginalIndices(indices);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    setIsFlipped(false);
  }, [card]);

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOptionIndex(index);
    setIsAnswered(true);
    const originalIndex = originalIndices[index];
    if (originalIndex === card.correctOptionIndex) {
      markCorrect(card.id);
    } else {
      markIncorrect(card.id);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    onNext();
  };

  const handleSkip = () => {
    skipCard(card.id);
    setIsFlipped(false);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
    onNext();
  };

  const score = calculateCardScore(card.timesCorrect, card.timesIncorrect);
  const totalAttempts = card.timesCorrect + card.timesIncorrect;
  const shuffledCorrectIndex = originalIndices.findIndex((i) => i === card.correctOptionIndex);

  const difficultyLabel = ["", "Easy", "Easy", "Medium", "Hard", "Hard"][card.difficulty] ?? "Medium";
  const difficultyColor =
    card.difficulty <= 2
      ? "text-green-600 dark:text-green-400"
      : card.difficulty >= 4
      ? "text-red-500 dark:text-red-400"
      : "text-yellow-600 dark:text-yellow-400";

  const footer = (isFront: boolean) => (
    <div className="flex-shrink-0 border-t px-6 py-4 space-y-3">
      {/* Centered flip button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setIsFlipped((f) => !f)}
          variant="outline"
          className="rounded-full px-8"
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          {isFront ? "See answer" : "Question"}
        </Button>
      </div>
      {/* Skip / Next row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {totalAttempts > 0 ? `${score}% · ${totalAttempts} attempts` : ""}
        </span>
        {isAnswered ? (
          <Button onClick={handleNext} size="sm" variant="ghost" className="text-sm font-medium">
            Next →
          </Button>
        ) : (
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto" style={{ perspective: "1200px" }}>
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <Card
          className="w-full flex flex-col border-2 shadow-md overflow-hidden"
          style={{ backfaceVisibility: "hidden", pointerEvents: isFlipped ? "none" : "auto", minHeight: "420px" }}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Question</h3>
              <span className={`text-xs font-medium ${difficultyColor}`}>{difficultyLabel}</span>
            </div>
            <p className="text-lg leading-snug">{card.question}</p>
            <div className="space-y-2.5 pt-1">
              {shuffledOptions.map((option, index) => (
                <Button
                  key={index}
                  variant={
                    selectedOptionIndex === null
                      ? "outline"
                      : index === shuffledCorrectIndex
                      ? "success"
                      : selectedOptionIndex === index
                      ? "destructive"
                      : "outline"
                  }
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto rounded-md whitespace-normal flex items-start min-h-[3rem] transition-all duration-200",
                    selectedOptionIndex === null
                      ? ""
                      : index === shuffledCorrectIndex
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                      : selectedOptionIndex === index
                      ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                      : "opacity-50"
                  )}
                  onClick={() => handleOptionSelect(index)}
                  disabled={isAnswered}
                >
                  <span className="font-bold mr-3 shrink-0 text-muted-foreground">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="break-words flex-1">{option}</span>
                </Button>
              ))}
            </div>
          </div>
          {footer(true)}
        </Card>

        {/* BACK */}
        <Card
          className="absolute top-0 left-0 w-full h-full flex flex-col border-2 shadow-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            pointerEvents: isFlipped ? "auto" : "none",
          }}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Answer</h3>
              <span className={`text-xs font-medium ${difficultyColor}`}>{difficultyLabel}</span>
            </div>
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
              <p className="font-semibold text-green-700 dark:text-green-400">
                {shuffledOptions[shuffledCorrectIndex]}
              </p>
            </div>
            {(card.explanation ?? card.answer) && (
              <p className="leading-relaxed text-muted-foreground text-sm">
                {card.explanation ?? card.answer}
              </p>
            )}
          </div>
          {footer(false)}
        </Card>
      </div>
    </div>
  );
}
