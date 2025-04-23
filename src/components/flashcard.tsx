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
  const { markCorrect, markIncorrect } = useFlashcardStore();

  // Shuffle options when card changes
  useEffect(() => {
    // Ensure options exists, fallback to empty array if it doesn't
    const originalOptions =
      card.options && card.options.length === 4
        ? card.options
        : ["Option A", "Option B", "Option C", "Option D"];

    const [shuffled, indices] = shuffleArray(originalOptions);
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

  // Calculate score metrics
  const score = calculateCardScore(card.timesCorrect, card.timesIncorrect);
  const totalAttempts = card.timesCorrect + card.timesIncorrect;

  // Find the shuffled index that corresponds to the correct option
  const shuffledCorrectIndex = originalIndices.findIndex(
    (i) => i === card.correctOptionIndex
  );

  return (
    <Card
      className={cn(
        "w-full max-w-md mx-auto overflow-hidden transition-all duration-700 border-2 border-gray-900 shadow-md",
        isFlipped ? "bg-muted/30" : ""
      )}
    >
      <CardContent className="p-6">
        <div className="min-h-[260px] flex items-start justify-center relative perspective-1000">
          <div
            className={cn(
              "w-full transition-all duration-700 transform backface-visibility-hidden",
              isFlipped
                ? "rotate-y-180 absolute opacity-0"
                : "rotate-y-0 relative opacity-100"
            )}
          >
            <h3 className="text-xl font-semibold mb-4">Question</h3>
            <p className="text-lg mb-6">{card.question}</p>

            <div className="space-y-3">
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
                    "w-full justify-start text-left p-3 h-auto border-gray-500 rounded-md",
                    selectedOptionIndex === null
                      ? ""
                      : index === shuffledCorrectIndex
                      ? "border-green-500 bg-green-50"
                      : selectedOptionIndex === index
                      ? "border-red-500 bg-red-50"
                      : "opacity-70"
                  )}
                  onClick={() => handleOptionSelect(index)}
                  disabled={isAnswered}
                >
                  <span className="font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                </Button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "w-full transition-all duration-700 transform backface-visibility-hidden",
              isFlipped
                ? "rotate-y-0 relative opacity-100"
                : "rotate-y-180 absolute opacity-0"
            )}
          >
            <h3 className="text-xl font-semibold mb-4">Detailed Answer</h3>
            <div className="text-lg">
              <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-md">
                <p className="font-medium text-green-700">
                  Correct answer: {shuffledOptions[shuffledCorrectIndex]}
                </p>
              </div>
              <div className="prose">{card.answer}</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 p-6 pt-0 border-t-2">
        <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
          <div>Difficulty: {card.difficulty}/5</div>
          {totalAttempts > 0 && (
            <div className="flex gap-1 items-center">
              <span>Score: {score}%</span>
              <span className="text-xs">({totalAttempts} attempts)</span>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button
            onClick={handleFlip}
            variant="outline"
            className="flex-1 border-gray-500"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            {isFlipped ? "Show Question" : "Show Answer"}
          </Button>

          {isAnswered && (
            <Button
              onClick={handleNext}
              variant="default"
              className="flex-1 border-2"
            >
              Next Card
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
