"use client";

import { useState } from "react";
import { PdfUpload } from "@/components/pdf-upload";
import { FlashcardGenerator } from "@/components/flashcard-generator";
import { FlashcardSession } from "@/components/flashcard-session";
import { FlashcardList } from "@/components/flashcard-list";
import { FlashcardImportExport } from "@/components/flashcard-import-export";
import { useFlashcardStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, BookOpen, Brain, List } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { pdfContent } = useFlashcardStore();

  return (
    <main className="container mx-auto py-8 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">PDF Flashcard Generator</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDF documents and create flashcards with AI
        </p>
      </header>

      <div className="mb-8 flex justify-center">
        <div className="border rounded-lg p-1 flex space-x-1">
          <TabButton
            isActive={activeTab === "upload"}
            onClick={() => setActiveTab("upload")}
            icon={<FileUp className="h-4 w-4" />}
            label="Upload & Generate"
          />
          <TabButton
            isActive={activeTab === "study"}
            onClick={() => setActiveTab("study")}
            icon={<Brain className="h-4 w-4" />}
            label="Study Flashcards"
          />
          <TabButton
            isActive={activeTab === "list"}
            onClick={() => setActiveTab("list")}
            icon={<List className="h-4 w-4" />}
            label="View All Cards"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {activeTab === "upload" && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileUp className="h-5 w-5 mr-2" />
                  Upload PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PdfUpload />
              </CardContent>
            </Card>

            {pdfContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Generate Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FlashcardGenerator />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "study" && <FlashcardSession />}

        {activeTab === "list" && (
          <>
            <FlashcardList />
            <FlashcardImportExport />
          </>
        )}
      </div>
    </main>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ isActive, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 flex items-center rounded-md transition-all ${
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
}
