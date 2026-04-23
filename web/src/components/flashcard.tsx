"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, RotateCw } from "lucide-react";
import {
  useFlashcardStore,
  type Flashcard as FlashcardType,
} from "@/lib/store";
import { cn, calculateCardScore } from "@/lib/utils";

interface FlashcardProps {
  card: FlashcardType;
  onNext: () => void;
}

// Function to shuffle an array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): [T[], number[]] => {
  const shuffled = [...array];
  const indices = array.map((_, i) => i); // Create an array of original indices

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements in both arrays
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return [shuffled, indices];
};

export function Flashcard({ card, onNext }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null
  );
  const [isAnswered, setIsAnswered] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [originalIndices, setOriginalIndices] = useState<number[]>([]);
  const { markCorrect, markIncorrect, skipCard } = useFlashcardStore();

  // Shuffle options when card changes
  useEffect(() => {
    // Ensure options exists, fallback to empty array if it doesn't
    const originalOptions =
      card.options && card.options.length === 4
        ? card.options
        : ["Option A", "Option B", "Option C", "Option D"];

    const [shuffled, indices] = shuffleArray(originalOptions);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new rule in eslint-plugin-react-hooks@7 (Next 16 upgrade); refactor deferred
    setShuffledOptions(shuffled);
    setOriginalIndices(indices);
    setSelectedOptionIndex(null);
    setIsAnswered(false);
  }, [card]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;

    setSelectedOptionIndex(index);
    setIsAnswered(true);

    // Map the selected shuffle index back to its original index
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

  // Calculate score metrics
  const score = calculateCardScore(card.timesCorrect, card.timesIncorrect);
  const totalAttempts = card.timesCorrect + card.timesIncorrect;

  // Find the shuffled index that corresponds to the correct option
  const shuffledCorrectIndex = originalIndices.findIndex(
    (i) => i === card.correctOptionIndex
  );

  return (
    <div className="w-full max-w-md mx-auto" style={{ perspective: "1200px" }}>
      {/* Flipping container */}
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT — Question + Options (normal flow, sets container height) */}
        <Card
          className="w-full overflow-hidden border-2 shadow-md"
          style={{
            backfaceVisibility: "hidden",
            pointerEvents: isFlipped ? "none" : "auto",
          }}
        >
          <CardContent className="p-6 space-y-4">
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
          </CardContent>
          <CardFooter className="flex gap-2 p-6 pt-0 border-t">
            <div className="flex-1 text-xs text-muted-foreground self-center">
              {totalAttempts > 0 && `${score}% · ${totalAttempts} attempts`}
            </div>
            <Button onClick={handleFlip} variant="outline" size="sm">
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              See answer
            </Button>
            {isAnswered ? (
              <Button onClick={handleNext} size="sm">Next</Button>
            ) : (
              <Button onClick={handleSkip} variant="outline" size="sm">Skip</Button>
            )}
          </CardFooter>
        </Card>

        {/* BACK — Answer (absolute, same size as front, rotated 180deg) */}
        <Card
          className="absolute top-0 left-0 w-full h-full overflow-hidden border-2 shadow-md"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            pointerEvents: isFlipped ? "auto" : "none",
          }}
        >
          <CardContent className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Answer</h3>
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
              <p className="font-semibold text-green-700 dark:text-green-400">
                {shuffledOptions[shuffledCorrectIndex]}
              </p>
            </div>
            <p className="leading-relaxed">{card.answer}</p>
          </CardContent>
          <CardFooter className="flex gap-2 p-6 pt-0 border-t">
            <div className="flex-1 text-xs text-muted-foreground self-center">
              Difficulty {card.difficulty}/5
            </div>
            <Button onClick={handleFlip} variant="outline" size="sm">
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            {isAnswered ? (
              <Button onClick={handleNext} size="sm">Next</Button>
            ) : (
              <Button onClick={handleSkip} variant="outline" size="sm">Skip</Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
