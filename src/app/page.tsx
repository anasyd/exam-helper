"use client";

import { useState } from "react";
import { PdfUpload } from "@/components/pdf-upload";
import { FlashcardGenerator } from "@/components/flashcard-generator";
import { FlashcardSession } from "@/components/flashcard-session";
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, FileText, BookOpen, X } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "study">("upload");
  const { flashcards, isProcessing, pdfContent, clearFlashcards } =
    useFlashcardStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-block rounded-full bg-primary/10 p-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">PDF Flashcard Generator</h1>
          <p className="text-muted-foreground">
            Upload a PDF, let AI generate flashcards, and study with spaced
            repetition
          </p>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-4 border rounded-md bg-muted/30">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Processing...</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            <FileText className="mr-2 h-4 w-4" />
            Upload & Generate
          </Button>
          <Button
            variant={activeTab === "study" ? "default" : "outline"}
            onClick={() => setActiveTab("study")}
            disabled={isProcessing || flashcards.length === 0}
            className="flex-1 sm:flex-none"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Study Flashcards ({flashcards.length})
          </Button>
          {flashcards.length > 0 && (
            <Button
              variant="outline"
              onClick={clearFlashcards}
              disabled={isProcessing}
              className="flex-1 sm:flex-none"
            >
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        <div className="w-full">
          {activeTab === "upload" && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-center">
                  Step 1: Upload a PDF
                </h2>
                <PdfUpload />
              </section>

              {pdfContent && (
                <section className="space-y-4">
                  <h2 className="text-xl font-semibold text-center">
                    Step 2: Generate Flashcards
                  </h2>
                  <FlashcardGenerator />
                </section>
              )}
            </div>
          )}

          {activeTab === "study" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center">
                Study Session
              </h2>
              <FlashcardSession />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
