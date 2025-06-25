"use client";

import { useState } from "react";
import { Flashcard } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopicQuizViewProps {
  cardsToPractice: Flashcard[];
  quizTitle: string;
  onQuizComplete: (passed: boolean) => void; // Updated to indicate if quiz was "passed"
}

export function TopicQuizView({
  cardsToPractice,
  quizTitle,
  onQuizComplete,
}: TopicQuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  if (!cardsToPractice || cardsToPractice.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Quiz: {quizTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No questions available for this topic.</p>
          <Button onClick={() => onQuizComplete(false)} className="mt-4">
            Back
          </Button>{" "}
          {/* Passed false */}
        </CardContent>
      </Card>
    );
  }

  const currentCard = cardsToPractice[currentIndex];
  const totalCards = cardsToPractice.length;

  const handleNext = () => {
    setShowAnswer(false);
    setSelectedOption(null);
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setQuizFinished(true); // Mark as finished to show completion screen
    }
  };

  const handlePrevious = () => {
    setShowAnswer(false);
    setSelectedOption(null);
    setQuizFinished(false); // If going back, quiz is not finished
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex);
    setShowAnswer(true); // Automatically show answer when an option is selected
  };

  if (quizFinished) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 text-center">
        <CardHeader>
          <CardTitle>Quiz Complete!</CardTitle>
          <CardDescription>
            You have finished the quiz for "{quizTitle}".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p>Great job reviewing the material!</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => onQuizComplete(true)}>
            Close Quiz & Mark Complete
          </Button>{" "}
          {/* Passed true */}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <CardTitle>Quiz: {quizTitle}</CardTitle>
            <CardDescription>
              Question {currentIndex + 1} of {totalCards}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuizComplete(false)}
            className="ml-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Study Guide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-lg font-semibold p-6 bg-muted rounded-md min-h-[100px] break-words whitespace-normal leading-relaxed">
          {currentCard.question}
        </div>

        <div className="space-y-3">
          {currentCard.options.map((option, index) => {
            const isCorrect = index === currentCard.correctOptionIndex;
            const isSelected = selectedOption === index;

            let variant:
              | "default"
              | "outline"
              | "secondary"
              | "destructive"
              | "ghost"
              | "link" = "outline";
            if (showAnswer) {
              if (isCorrect) variant = "secondary"; // Correct answer
              if (isSelected && !isCorrect) variant = "destructive"; // User selected wrong
            }

            return (
              <Button
                key={index}
                variant={variant}
                className={`w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-h-[48px] ${
                  showAnswer && isCorrect ? "border-2 border-green-500" : ""
                } ${
                  showAnswer && isSelected && !isCorrect
                    ? "border-2 border-red-500"
                    : ""
                }`}
                onClick={() => !showAnswer && handleOptionSelect(index)} // Allow selection only if answer isn't shown
                disabled={showAnswer && selectedOption !== null} // Disable options after one is selected and answer shown
              >
                <div className="flex items-start w-full">
                  <Badge
                    variant="outline"
                    className="mr-3 flex-shrink-0 mt-0.5"
                  >
                    {String.fromCharCode(65 + index)}
                  </Badge>
                  <span className="flex-1 break-words">{option}</span>
                  <div className="flex-shrink-0 ml-2">
                    {showAnswer && isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {showAnswer && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {showAnswer && (
          <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
            <CardHeader>
              <CardTitle className="text-md text-green-700 dark:text-green-300">
                Answer & Explanation
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none break-words">
              <p className="break-words">
                <strong>
                  Correct Answer:{" "}
                  {String.fromCharCode(65 + currentCard.correctOptionIndex)}.
                </strong>{" "}
                <span className="break-words">
                  {currentCard.options[currentCard.correctOptionIndex]}
                </span>
              </p>
              <p className="break-words leading-relaxed">
                {currentCard.answer}
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {!showAnswer && selectedOption === null && (
          <Button onClick={() => setShowAnswer(true)} variant="outline">
            Show Answer
          </Button>
        )}
        {showAnswer && (
          <Button onClick={handleNext}>
            {currentIndex === totalCards - 1 ? "Finish Quiz" : "Next"}{" "}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
