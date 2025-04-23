"use client";

import { useState } from "react";
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

export function Flashcard({ card, onNext }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null
  );
  const [isAnswered, setIsAnswered] = useState(false);
  const { markCorrect, markIncorrect } = useFlashcardStore();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;

    setSelectedOptionIndex(index);
    setIsAnswered(true);

    if (index === card.correctOptionIndex) {
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

  // Ensure options exists, fallback to empty array if it doesn't
  const options =
    card.options && card.options.length === 4
      ? card.options
      : ["Option A", "Option B", "Option C", "Option D"];

  return (
    <Card
      className={cn(
        "w-full max-w-md mx-auto overflow-hidden transition-all duration-700",
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

            <div className="space-y-2">
              {options.map((option, index) => (
                <Button
                  key={index}
                  variant={
                    selectedOptionIndex === null
                      ? "outline"
                      : index === card.correctOptionIndex
                      ? "success"
                      : selectedOptionIndex === index
                      ? "destructive"
                      : "outline"
                  }
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto",
                    selectedOptionIndex === null
                      ? ""
                      : index === card.correctOptionIndex
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
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="font-medium text-green-700">
                  Correct answer: {options[card.correctOptionIndex]}
                </p>
              </div>
              <div className="prose">{card.answer}</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 p-6 pt-0 border-t">
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
          <Button onClick={handleFlip} variant="outline" className="flex-1">
            <RotateCw className="mr-2 h-4 w-4" />
            {isFlipped ? "Show Question" : "Show Answer"}
          </Button>

          {isAnswered && (
            <Button onClick={handleNext} variant="default" className="flex-1">
              Next Card
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
