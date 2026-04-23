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

  const footerButtons = (
    <div className="flex items-center gap-3 justify-center">
      <Button onClick={() => setIsFlipped((f) => !f)} variant="outline">
        <RotateCw className="mr-1.5 h-3.5 w-3.5" />
        {isFlipped ? "Question" : "See answer"}
      </Button>
      {isAnswered ? (
        <Button onClick={handleNext}>Next</Button>
      ) : (
        <Button onClick={handleSkip} variant="outline">Skip</Button>
      )}
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
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Question</h3>
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
          <div className="flex-shrink-0 border-t px-6 py-4 space-y-2">
            {footerButtons}
            {totalAttempts > 0 && (
              <p className="text-center text-xs text-muted-foreground">{score}% · {totalAttempts} attempts</p>
            )}
          </div>
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
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Answer</h3>
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
              <p className="font-semibold text-green-700 dark:text-green-400">
                {shuffledOptions[shuffledCorrectIndex]}
              </p>
            </div>
            {(card.explanation ?? card.answer) && (
              <p className="leading-relaxed text-muted-foreground">
                {card.explanation ?? card.answer}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 border-t px-6 py-4 space-y-2">
            {footerButtons}
            <p className="text-center text-xs text-muted-foreground">Difficulty {card.difficulty}/5</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
