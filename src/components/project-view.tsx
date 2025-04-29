"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFlashcardStore } from "@/lib/store";
import { PdfUpload } from "@/components/pdf-upload";
import { FlashcardGenerator } from "@/components/flashcard-generator";
import { FlashcardSession } from "@/components/flashcard-session";
import { FlashcardList } from "@/components/flashcard-list";
import { FlashcardImportExport } from "@/components/flashcard-import-export";
import { AppSettings } from "@/components/app-settings";
import { ShareProjectDialog } from "@/components/share-project-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FileUp,
  BookOpen,
  Brain,
  List,
  ArrowLeft,
  Settings,
} from "lucide-react";

export function ProjectView() {
  const router = useRouter();
  const { getActiveProject, setActiveProject } = useFlashcardStore();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [mounted, setMounted] = useState(false);
  const activeProject = getActiveProject();

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // If no active project is set, redirect to the projects list
  useEffect(() => {
    if (mounted && !activeProject) {
      router.push("/");
    }
  }, [activeProject, router, mounted]);

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  if (!activeProject) {
    return null; // Will redirect via the useEffect
  }

  const handleBackToProjects = () => {
    setActiveProject(null);
    router.push("/");
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-4"
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{activeProject.name}</h1>
            {activeProject.description && (
              <p className="text-muted-foreground">
                {activeProject.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ShareProjectDialog projectId={activeProject.id} />
          <AppSettings />
        </div>
      </div>

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
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileUp className="h-5 w-5 mr-2" />
                      Upload PDF
                    </CardTitle>
                    <CardDescription>
                      Upload PDF files to generate flashcards for this project
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activeProject.flashcards.length} cards in this project
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PdfUpload />
              </CardContent>
            </Card>

            <FlashcardImportExport />

            {activeProject.pdfContent && (
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

        {activeTab === "list" && <FlashcardList />}
      </div>
    </div>
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
