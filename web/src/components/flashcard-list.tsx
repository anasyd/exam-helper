"use client";

import { useState } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FlashcardList() {
  const { getActiveProject, deleteFlashcard } = useFlashcardStore();
  const activeProject = getActiveProject();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">(
    "all"
  );
  const [cardToDelete, setCardToDelete] = useState<{
    id: string;
    question: string;
  } | null>(null);

  // Toggle a card's expanded state
  const toggleCard = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  // Handle delete flashcard
  const handleDeleteCard = () => {
    if (cardToDelete) {
      deleteFlashcard(cardToDelete.id);
      setCardToDelete(null);
    }
  };

  // Stop event propagation when clicking on delete button to prevent toggling the card
  const handleDeleteClick = (
    e: React.MouseEvent,
    card: { id: string; question: string }
  ) => {
    e.stopPropagation();
    setCardToDelete(card);
  };

  // Early return if no active project
  if (!activeProject) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-center">No Project Selected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Please select or create a project to view flashcards.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter flashcards based on search term and difficulty filter
  const filteredFlashcards = (activeProject.flashcards || []).filter((card) => {
    // Text search
    const matchesSearch =
      searchTerm === "" ||
      card.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchTerm.toLowerCase());

    // Difficulty filter
    let matchesDifficulty = true;
    if (filter === "easy") matchesDifficulty = (card.difficulty || 3) <= 2;
    if (filter === "medium") matchesDifficulty = (card.difficulty || 3) === 3;
    if (filter === "hard") matchesDifficulty = (card.difficulty || 3) >= 4;

    return matchesSearch && matchesDifficulty;
  });

  if (!activeProject.flashcards || activeProject.flashcards.length === 0) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-center">No Flashcards Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Upload a PDF and generate flashcards to view them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flashcards..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="py-2 px-4 rounded-md border border-input bg-background text-sm"
            value={filter}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing, deferred
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy (1-2)</option>
            <option value="medium">Medium (3)</option>
            <option value="hard">Hard (4-5)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filteredFlashcards.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            No flashcards match your search criteria.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground pb-1">
              Showing {filteredFlashcards.length} of {activeProject.flashcards.length} flashcards
            </p>

            {filteredFlashcards.map((card) => (
              <Card
                key={card.id}
                className="hover:border-primary/50 transition-all"
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer gap-3"
                  onClick={() => toggleCard(card.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        card.difficulty <= 2
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                          : card.difficulty >= 4
                          ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400"
                      }`}
                    >
                      {card.difficulty}
                    </span>
                    <span className="text-sm font-medium truncate">{card.question}</span>
                    {card.timesCorrect + card.timesIncorrect > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {Math.round((card.timesCorrect / (card.timesCorrect + card.timesIncorrect)) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleDeleteClick(e, { id: card.id, question: card.question })}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                    {expandedCardId === card.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedCardId === card.id && (
                  <CardContent className="px-4 pb-4 pt-0 border-t">
                    <div className="pt-3 space-y-3">
                      {card.explanation ? (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Explanation</div>
                          <p className="text-sm">{card.explanation}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Answer</div>
                          <p className="text-sm">{card.answer}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {card.options.map((option, index) => (
                          <div
                            key={index}
                            className={`text-xs p-2 rounded border ${
                              index === card.correctOptionIndex
                                ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                                : "border-muted text-muted-foreground"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}. {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </>
        )}
      </div>

      <Dialog
        open={!!cardToDelete}
        onOpenChange={(open) => !open && setCardToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flashcard</DialogTitle>
            <DialogDescription>
              {/* eslint-disable-next-line react/no-unescaped-entities -- pre-existing, deferred */}
              Are you sure you want to delete the flashcard: "
              {/* eslint-disable-next-line react/no-unescaped-entities -- pre-existing, deferred */}
              {cardToDelete?.question}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCard}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
