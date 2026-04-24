"use client";

import { useState, useEffect, useCallback } from "react";
import { Flashcard } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ChevronLeft, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_LIVES = 3;

interface TopicQuizViewProps {
  cardsToPractice: Flashcard[];
  quizTitle: string;
  onQuizComplete: (passed: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TopicQuizView({ cardsToPractice, quizTitle, onQuizComplete }: TopicQuizViewProps) {
  const [queue, setQueue] = useState<Flashcard[]>(() => shuffle(cardsToPractice));
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(() => new Set());
  const [lives, setLives] = useState(MAX_LIVES);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [optionMap, setOptionMap] = useState<number[]>([]);
  const [celebration, setCelebration] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [passed, setPassed] = useState(false);

  const totalCards = cardsToPractice.length;
  const currentCard = queue[0] ?? null;
  const progress = Math.round((answeredIds.size / totalCards) * 100);

  // Shuffle options when current card changes
  useEffect(() => {
    if (!currentCard?.options?.length) return;
    const indices = currentCard.options.map((_, i) => i);
    const shuffledIdx = shuffle(indices);
    setShuffledOptions(shuffledIdx.map((i) => currentCard.options[i]));
    setOptionMap(shuffledIdx);
    setSelectedIdx(null);
    setIsAnswered(false);
  }, [currentCard?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((displayIdx: number) => {
    if (isAnswered || !currentCard) return;
    setSelectedIdx(displayIdx);
    setIsAnswered(true);

    const originalIdx = optionMap[displayIdx];
    const correct = originalIdx === currentCard.correctOptionIndex;

    if (correct) {
      setCelebration(true);
      setAnsweredIds((prev) => new Set(prev).add(currentCard.id));
      if (queue.length === 1) {
        setTimeout(() => { setCelebration(false); setQuizDone(true); setPassed(true); }, 1400);
      } else {
        // Delay advancing so the user sees the correct answer highlight
        setTimeout(() => {
          setCelebration(false);
          setQueue((prev) => prev.slice(1));
        }, 1400);
      }
    } else {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 600);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setTimeout(() => { setQuizDone(true); setPassed(false); }, 900);
      }
      // Queue advance happens when user clicks Continue (below)
    }
  }, [isAnswered, currentCard, optionMap, lives, queue.length]);


  if (!cardsToPractice.length) {
    return (
      <div className="max-w-xl mx-auto mt-6 space-y-4">
        <button onClick={() => onQuizComplete(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Roadmap
        </button>
        <p className="text-muted-foreground text-center py-12">No questions available for this topic.</p>
      </div>
    );
  }

  if (quizDone) {
    return (
      <div className="max-w-xl mx-auto mt-6 space-y-6 text-center">
        <button onClick={() => onQuizComplete(passed)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Roadmap
        </button>
        <div className="py-12 space-y-4">
          {passed ? (
            <>
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-bounce" />
              <h2 className="text-2xl font-bold">Section Complete!</h2>
              <p className="text-muted-foreground">You answered all {totalCards} questions correctly.</p>
            </>
          ) : (
            <>
              <XCircle className="h-20 w-20 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold">Out of lives</h2>
              <p className="text-muted-foreground">You ran out of hearts. Try again!</p>
            </>
          )}
          <div className="flex gap-3 justify-center pt-2">
            {!passed && (
              <Button variant="outline" onClick={() => {
                setQueue(shuffle(cardsToPractice));
                setAnsweredIds(new Set());
                setLives(MAX_LIVES);
                setSelectedIdx(null);
                setIsAnswered(false);
                setQuizDone(false);
              }}>
                Try Again
              </Button>
            )}
            <Button onClick={() => onQuizComplete(passed)}>
              {passed ? "Continue" : "Back to Roadmap"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  const shuffledCorrectIdx = optionMap.findIndex((i) => i === currentCard.correctOptionIndex);
  const isCorrect = selectedIdx === shuffledCorrectIdx;

  return (
    <div className="max-w-xl mx-auto mt-2 space-y-4">
      {/* Back button — leftmost */}
      <button
        onClick={() => onQuizComplete(false)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Roadmap
      </button>

      {/* Lives + title */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">{quizTitle}</h2>
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={cn("h-5 w-5 transition-all duration-300", i < lives ? "text-red-500 fill-red-500" : "text-muted-foreground/30")}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{answeredIds.size}/{totalCards} done</p>
      </div>

      {/* Question card */}
      <div className={cn("rounded-xl border bg-card p-6 space-y-5 shadow-sm transition-all duration-300", wrongShake && "animate-[shake_0.4s_ease-in-out]", celebration && "ring-2 ring-green-500 ring-offset-2")}>
        {/* Celebration overlay */}
        {celebration && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-[confetti_0.8s_ease-out_forwards]"
                style={{
                  background: ["#22c55e","#f59e0b","#3b82f6","#ec4899","#a855f7"][i % 5],
                  left: `${15 + i * 10}%`,
                  top: "40%",
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        )}

        <p className="text-lg font-medium leading-snug">{currentCard.question}</p>

        <div className="space-y-2.5">
          {shuffledOptions.map((option, idx) => {
            let variant: "outline" | "default" | "destructive" = "outline";
            let extra = "";
            if (isAnswered) {
              if (idx === shuffledCorrectIdx) { variant = "default"; extra = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10"; }
              else if (idx === selectedIdx) { variant = "destructive"; extra = "opacity-90"; }
              else { extra = "opacity-40"; }
            }
            return (
              <Button
                key={idx}
                variant={variant}
                disabled={isAnswered}
                onClick={() => handleSelect(idx)}
                className={cn("w-full justify-start text-left h-auto py-3 px-4 whitespace-normal min-h-[44px] transition-all duration-200", extra)}
              >
                <span className="font-bold mr-3 shrink-0 text-muted-foreground">{String.fromCharCode(65 + idx)}</span>
                <span className="flex-1 break-words">{option}</span>
                {isAnswered && idx === shuffledCorrectIdx && <CheckCircle className="ml-2 h-4 w-4 shrink-0 text-green-500" />}
                {isAnswered && idx === selectedIdx && idx !== shuffledCorrectIdx && <XCircle className="ml-2 h-4 w-4 shrink-0 text-red-500" />}
              </Button>
            );
          })}
        </div>

        {isAnswered && !isCorrect && (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <p className="font-semibold mb-1">Correct answer: {String.fromCharCode(65 + shuffledCorrectIdx)}</p>
            <p className="text-muted-foreground">{currentCard.answer}</p>
          </div>
        )}

        {isAnswered && !isCorrect && lives > 0 && (
          <Button
            className="w-full"
            onClick={() => {
              setQueue((prev) => [...prev.slice(1), currentCard!]);
            }}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
