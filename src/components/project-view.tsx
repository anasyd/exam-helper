"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFlashcardStore, Project as ProjectType } from "@/lib/store"; // Import Project type
import { DocumentUpload } from "@/components/document-upload";
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
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, Lock } from "lucide-react";

import {
  FileUp,
  BookOpen,
  Brain,
  List,
  ArrowLeft,
  Settings,
  BookCopy,
  VideoIcon,
  FileTextIcon,
  LayoutDashboard,
  ListChecks,
  Flame, // Added for streak
  Zap, // For generate MCQs button
} from "lucide-react";
import { StudyContentView } from "./study-content-view";
import {
  createGeminiService,
  StudyGuide,
  FlashcardData,
} from "@/lib/ai-service";
import { VideoUpload } from "./video-upload";
import { NotesView } from "./notes-view";
import { toast } from "sonner";
import { TopicQuizView } from "@/components/topic-quiz-view";
import { Flashcard } from "@/lib/store";

// GamifiedRoadmapView Implementation
function GamifiedRoadmapView({ project }: { project: ProjectType | null }) {
  const { markTopicAsComplete, addFlashcards, setStudyGuide, geminiApiKey } =
    useFlashcardStore();
  const [showQuizView, setShowQuizView] = useState(false);
  const [quizCards, setQuizCards] = useState<Flashcard[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [currentQuizContext, setCurrentQuizContext] = useState<{
    sectionIndex: number;
    topicIndex: number;
  } | null>(null);
  const [generatingMcqId, setGeneratingMcqId] = useState<string | null>(null);

  if (!project || !project.studyGuide) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gamified Learning Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            No study guide generated yet. Upload documents and generate study
            content first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { studyGuide, flashcards, xp } = project;

  const handleTopicClick = (
    sectionIndex: number,
    topicIndex: number,
    isLocked: boolean
  ) => {
    if (isLocked) {
      toast.info("Complete previous topics or sections to unlock this one.");
      return;
    }
    const topic = studyGuide.sections[sectionIndex]?.topics?.[topicIndex];
    if (!topic || topic.isCompleted || !topic.mcqsGenerated) {
      if (topic && !topic.mcqsGenerated && !topic.isCompleted)
        toast.info(
          "Generate MCQs for this topic first from the 'Study Content' tab to practice."
        );
      else if (topic && topic.isCompleted)
        toast.success("Topic already completed!");
      return;
    }

    const cardsForTopic = flashcards.filter(
      (card) =>
        card.sourceSectionTitle === studyGuide.sections[sectionIndex].title &&
        card.sourceTopicTitle === topic.title
    );

    if (cardsForTopic.length > 0) {
      setQuizCards(cardsForTopic);
      setQuizTitle(topic.title);
      setCurrentQuizContext({ sectionIndex, topicIndex });
      setShowQuizView(true);
    } else {
      toast.info(
        "No MCQs available for this topic, though marked as generated. Try regenerating from 'Study Content' tab."
      );
    }
  };

  const handleGenerateMCQs = async (
    contentToUse: string,
    title: string,
    isSection: boolean, // True if section, false if topic
    sectionIdx: number,
    topicIdx?: number
  ) => {
    console.log("MCQ Generation Started:", {
      title,
      isSection,
      contentToUse: contentToUse.slice(0, 100) + "...",
    });

    if (!project || !project.pdfContent) {
      console.error("MCQ Generation Failed - Missing requirements:", {
        hasProject: !!project,
        hasPdfContent: !!project?.pdfContent,
      });
      toast.error("Cannot generate MCQs", {
        description: "Project or document content is missing.",
      });
      return;
    }

    // Check if user has API key set
    const currentApiKey = useFlashcardStore.getState().geminiApiKey;

    if (!currentApiKey) {
      toast.error("Cannot generate MCQs", {
        description: "Please set your Gemini API key in Settings first.",
      });
      return;
    }

    const id = isSection
      ? `section-mcq-${sectionIdx}`
      : `topic-mcq-${sectionIdx}-${topicIdx}`;
    setGeneratingMcqId(id);
    const toastId = toast.loading(`Generating MCQs for "${title}"...`);

    try {
      const aiService = createGeminiService(currentApiKey);
      const sectionTitle = isSection
        ? title
        : studyGuide.sections[sectionIdx]?.title || "Unknown Section";
      const topicTitle = isSection ? undefined : title;

      // Get existing questions for this specific topic/section to avoid duplicates
      const existingTopicFlashcards = project.flashcards
        .filter(
          (card: Flashcard) =>
            card.sourceSectionTitle === sectionTitle &&
            (isSection
              ? !card.sourceTopicTitle
              : card.sourceTopicTitle === topicTitle)
        )
        .map((card: Flashcard) => ({
          question: card.question,
          answer: card.answer,
        }));

      const numCardsToGenerate = 5; // Or make this configurable

      const newMcqs = await aiService.generateFlashcards(
        project.pdfContent, // Main document content for context
        numCardsToGenerate,
        existingTopicFlashcards,
        title, // This is the specific title for the prompt context (section or topic)
        contentToUse // This is the specific content for the prompt context
      );

      if (newMcqs && newMcqs.length > 0) {
        console.log("MCQ Generation Successful:", {
          count: newMcqs.length,
          title,
          sectionTitle,
          topicTitle,
          firstMcq: newMcqs[0]?.question.slice(0, 50) + "...",
        });

        const countAdded = addFlashcards(
          newMcqs,
          null, // No general source content hash for topic MCQs specifically
          sectionTitle,
          topicTitle
        );

        console.log("MCQs added to store:", { countAdded, title });

        toast.success(`Generated ${countAdded} new MCQs for "${title}"!`, {
          id: toastId,
        });

        // Update mcqsGenerated flag in the studyGuide
        if (project && project.studyGuide) {
          const newStudyGuide = JSON.parse(JSON.stringify(project.studyGuide)); // Deep copy
          const currentSection = newStudyGuide.sections[sectionIdx];
          if (isSection && currentSection) {
            currentSection.mcqsGenerated = true;
            console.log("Updated section mcqsGenerated flag:", sectionTitle);
          } else if (
            !isSection &&
            currentSection &&
            currentSection.topics &&
            topicIdx !== undefined &&
            currentSection.topics[topicIdx]
          ) {
            currentSection.topics[topicIdx].mcqsGenerated = true;
            console.log("Updated topic mcqsGenerated flag:", topicTitle);
          }
          setStudyGuide(newStudyGuide);
        }
      } else {
        console.warn("MCQ Generation returned no results:", { title, newMcqs });
        toast.info(
          `No new MCQs generated for "${title}". They might be duplicates or generation failed.`,
          { id: toastId }
        );
      }
    } catch (error) {
      console.error("MCQ generation error:", error);
      toast.error(`Failed to generate MCQs for "${title}"`, {
        description: error instanceof Error ? error.message : "Unknown error",
        id: toastId,
      });
    } finally {
      setGeneratingMcqId(null);
    }
  };

  if (showQuizView && currentQuizContext) {
    return (
      <TopicQuizView
        cardsToPractice={quizCards}
        quizTitle={quizTitle}
        onQuizComplete={(passed) => {
          setShowQuizView(false);
          if (passed && currentQuizContext) {
            markTopicAsComplete(
              currentQuizContext.sectionIndex,
              currentQuizContext.topicIndex
            );
          }
          setCurrentQuizContext(null);
        }}
      />
    );
  }

  let overallPreviousNodeCompleted = true;

  return (
    <div className="space-y-6 pb-12">
      <Card className="shadow-lg sticky top-4 z-10 backdrop-blur-md bg-background/80">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-center px-4">
            <CardTitle className="text-3xl font-bold tracking-tight">
              {studyGuide.title || "Learning Roadmap"}
            </CardTitle>
            <div className="flex items-center space-x-4">
              {useFlashcardStore.getState().currentStreak > 0 && ( // Access streak from store directly for header
                <div className="flex items-center text-orange-500">
                  <Flame className="h-7 w-7 mr-1" />
                  <span className="text-2xl font-bold">
                    {useFlashcardStore.getState().currentStreak}
                  </span>
                </div>
              )}
              <div className="text-2xl font-bold text-amber-500 animate-pulse">
                {xp || 0} XP
              </div>
            </div>
          </div>
          <CardDescription>
            Your personalized journey through the material. Complete topics to
            earn XP and maintain your streak!
          </CardDescription>
        </CardHeader>
      </Card>

      {studyGuide.sections.map((section, sectionIndex) => {
        const isCurrentSectionLocked = !overallPreviousNodeCompleted;
        const currentSectionDisplayCompleted = !!section.isCompleted;

        let previousTopicInSectionCompleted = true;

        const sectionCardContent = (
          <>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isCurrentSectionLocked ? (
                    <Lock className="h-7 w-7 text-slate-400 mr-3 flex-shrink-0" />
                  ) : currentSectionDisplayCompleted ? (
                    <CheckCircle className="h-7 w-7 text-green-500 mr-3 flex-shrink-0" />
                  ) : (
                    <div className="h-7 w-7 border-2 border-dashed border-blue-400 rounded-full mr-3 flex-shrink-0 animate-pulse" />
                  )}
                  <CardTitle
                    className={`text-xl ${
                      isCurrentSectionLocked ? "text-slate-500" : ""
                    }`}
                  >
                    {section.title}
                  </CardTitle>
                </div>
              </div>
              {!isCurrentSectionLocked && (
                <div className="pl-10 flex items-center justify-between">
                  <CardDescription>
                    {section.mcqsGenerated ? (
                      <>
                        MCQs (
                        {
                          project.flashcards.filter(
                            (f) =>
                              f.sourceSectionTitle === section.title &&
                              !f.sourceTopicTitle
                          ).length
                        }{" "}
                        available)
                      </>
                    ) : (
                      <>MCQs not generated yet</>
                    )}
                    {section.xpAwardedOnCompletion &&
                      !currentSectionDisplayCompleted && (
                        <span className="ml-2 text-xs text-amber-600">
                          +{section.xpAwardedOnCompletion} XP
                        </span>
                      )}
                    {currentSectionDisplayCompleted &&
                      section.xpAwardedOnCompletion && (
                        <span className="ml-2 text-xs text-green-600">
                          +{section.xpAwardedOnCompletion} XP Earned!
                        </span>
                      )}
                  </CardDescription>
                  {!section.mcqsGenerated && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleGenerateMCQs(
                          section.content,
                          section.title,
                          true,
                          sectionIndex
                        )
                      }
                      disabled={
                        generatingMcqId === `section-mcq-${sectionIndex}`
                      }
                      className="ml-4"
                    >
                      {generatingMcqId === `section-mcq-${sectionIndex}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-4 w-4" />
                      )}
                      Generate MCQs
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>

            {section.topics &&
              section.topics.length > 0 &&
              !isCurrentSectionLocked && (
                <CardContent className="pl-10 pr-4 pb-4 space-y-3">
                  <div className="relative pl-5">
                    {section.topics.length > 0 && (
                      <div className="absolute left-[12px] top-2 bottom-2 w-0.5 bg-slate-300 dark:bg-slate-700 -translate-x-1/2"></div>
                    )}
                    {section.topics.map((topic, topicIndex) => {
                      const isCurrentTopicLocked =
                        !previousTopicInSectionCompleted;
                      const canAttemptCurrentTopic =
                        !isCurrentTopicLocked &&
                        !topic.isCompleted &&
                        !!topic.mcqsGenerated;

                      const topicNode = (
                        <div
                          key={`topic-roadmap-${sectionIndex}-${topicIndex}`}
                          className="relative mb-3"
                        >
                          <div className="absolute left-[calc(-8px - 0.125rem)] top-1/2 w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full -translate-y-1/2 border-2 border-background"></div>
                          <Card
                            className={`p-3 transition-colors
                                    ${
                                      isCurrentTopicLocked
                                        ? "opacity-60 bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed"
                                        : topic.isCompleted
                                        ? "bg-green-100 dark:bg-green-800/40 border-green-400 hover:bg-green-200 dark:hover:bg-green-800/60"
                                        : canAttemptCurrentTopic
                                        ? "bg-white dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
                                        : "bg-white dark:bg-slate-700/30 opacity-70"
                                    }`}
                            onClick={
                              canAttemptCurrentTopic
                                ? () =>
                                    handleTopicClick(
                                      sectionIndex,
                                      topicIndex,
                                      false
                                    )
                                : isCurrentTopicLocked
                                ? () =>
                                    handleTopicClick(
                                      sectionIndex,
                                      topicIndex,
                                      true
                                    )
                                : undefined
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {isCurrentTopicLocked ? (
                                  <Lock className="h-5 w-5 text-slate-400 mr-2 flex-shrink-0" />
                                ) : topic.isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                                ) : (
                                  <div
                                    className={`h-5 w-5 border-2 ${
                                      canAttemptCurrentTopic
                                        ? "border-blue-500 animate-pulse"
                                        : "border-slate-400"
                                    } rounded-full mr-2 flex-shrink-0`}
                                  />
                                )}
                                <h5
                                  className={`font-semibold ${
                                    isCurrentTopicLocked ? "text-slate-500" : ""
                                  }`}
                                >
                                  {topic.title}
                                </h5>
                              </div>
                            </div>
                            {!isCurrentTopicLocked && (
                              <div className="pl-7 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground">
                                    {topic.mcqsGenerated ? (
                                      <>
                                        MCQs (
                                        {
                                          project.flashcards.filter(
                                            (f) =>
                                              f.sourceSectionTitle ===
                                                section.title &&
                                              f.sourceTopicTitle === topic.title
                                          ).length
                                        }{" "}
                                        available)
                                      </>
                                    ) : (
                                      <>MCQs not generated yet</>
                                    )}
                                    {topic.xpAwardedOnCompletion &&
                                      !topic.isCompleted && (
                                        <span className="ml-2 text-xs text-amber-600">
                                          +{topic.xpAwardedOnCompletion} XP
                                        </span>
                                      )}
                                    {topic.isCompleted &&
                                      topic.xpAwardedOnCompletion && (
                                        <span className="ml-2 text-xs text-green-600">
                                          +{topic.xpAwardedOnCompletion} XP
                                          Earned!
                                        </span>
                                      )}
                                  </p>
                                  {!topic.mcqsGenerated && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent card click
                                        handleGenerateMCQs(
                                          topic.content,
                                          topic.title,
                                          false,
                                          sectionIndex,
                                          topicIndex
                                        );
                                      }}
                                      disabled={
                                        generatingMcqId ===
                                        `topic-mcq-${sectionIndex}-${topicIndex}`
                                      }
                                      className="ml-2 h-6 text-xs px-2"
                                    >
                                      {generatingMcqId ===
                                      `topic-mcq-${sectionIndex}-${topicIndex}` ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : (
                                        <Zap className="mr-1 h-3 w-3" />
                                      )}
                                      Generate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        </div>
                      );
                      if (!isCurrentTopicLocked) {
                        previousTopicInSectionCompleted = !!topic.isCompleted;
                      }
                      return topicNode;
                    })}
                  </div>
                </CardContent>
              )}
          </>
        );
        if (!isCurrentSectionLocked) {
          overallPreviousNodeCompleted =
            currentSectionDisplayCompleted ||
            (section.topics && section.topics.length > 0
              ? section.topics.every((t) => !!t.isCompleted)
              : true);
        }

        return (
          <Card
            key={`section-roadmap-${sectionIndex}`}
            className={`transition-all duration-300 ease-in-out transform hover:scale-[1.02]
                        ${
                          isCurrentSectionLocked
                            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
                            : currentSectionDisplayCompleted
                            ? "border-green-500 border-2 shadow-green-200/50 shadow-md"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
          >
            {sectionCardContent}
          </Card>
        );
      })}
      <Card className="mt-6 text-center p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Further gamification elements like streaks will be built upon this
          structure.
        </p>
      </Card>
    </div>
  );
}

export function ProjectView() {
  const router = useRouter();
  const {
    getActiveProject,
    setActiveProject,
    setStudyGuide,
    geminiApiKey,
    setVideoProcessingResult,
    clearVideoProcessingResult,
    setDocumentNotes,
    setVideoNotes,
    gamificationEnabled,
    setGamificationEnabled,
    currentStreak, // Added for display
  } = useFlashcardStore();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [mounted, setMounted] = useState(false);
  const [isGeneratingStudyContent, setIsGeneratingStudyContent] =
    useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isGeneratingDocumentNotes, setIsGeneratingDocumentNotes] =
    useState(false);
  const [isGeneratingVideoNotes, setIsGeneratingVideoNotes] = useState(false);
  const activeProject = getActiveProject();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !activeProject) {
      router.push("/");
    }
  }, [activeProject, router, mounted]);

  if (!mounted || !activeProject) {
    return null;
  }

  const handleBackToProjects = () => {
    setActiveProject(null);
    router.push("/");
  };

  const handleDocumentProcessingComplete = async (documentText: string) => {
    if (!geminiApiKey) {
      toast.error("Missing Gemini API Key", {
        description: "Please set your Gemini API key in App Settings.",
      });
      setIsGeneratingStudyContent(false);
      useFlashcardStore.getState().setIsProcessing(false);
      return;
    }
    if (!documentText) {
      toast.error("No text extracted from documents.");
      setIsGeneratingStudyContent(false);
      useFlashcardStore.getState().setIsProcessing(false);
      return;
    }
    // Check if this is additional content or the first content
    const activeProject = useFlashcardStore.getState().getActiveProject();
    const hasExistingContent =
      activeProject?.pdfContent ||
      activeProject?.documentNotes ||
      activeProject?.studyGuide;

    if (hasExistingContent) {
      // Append to existing content
      useFlashcardStore.getState().appendDocumentContent(documentText);
    } else {
      // First time - set content directly
      useFlashcardStore.getState().setDocumentContent(documentText);
    }
    setIsGeneratingStudyContent(true);
    useFlashcardStore.getState().setIsProcessing(true);
    const toastId = toast.loading("Generating All Study Content...", {
      description:
        "AI is generating notes, flashcards, study guide, and audio...",
    });
    try {
      const aiService = createGeminiService(geminiApiKey);

      // Generate all content types automatically
      const allContent = await aiService.generateAllContentTypes(documentText, {
        generateFlashcards: true,
        generateNotes: true,
        generateStudyGuide: true,
        numberOfFlashcards: 15,
      });

      // Store all generated content intelligently
      if (allContent.studyGuide) {
        if (hasExistingContent && activeProject?.studyGuide) {
          // Merge with existing study guide
          useFlashcardStore.getState().mergeStudyGuide(allContent.studyGuide);
        } else {
          // First study guide - set directly
          setStudyGuide(allContent.studyGuide);
        }
      }

      if (allContent.notes) {
        if (hasExistingContent && activeProject?.documentNotes) {
          // Append to existing notes
          useFlashcardStore.getState().appendDocumentNotes(allContent.notes);
        } else {
          // First notes - set directly
          setDocumentNotes(allContent.notes);
        }
      }

      if (allContent.flashcards && allContent.flashcards.length > 0) {
        const flashcardStore = useFlashcardStore.getState();
        flashcardStore.addFlashcards(allContent.flashcards, documentText);
      }

      toast.success(
        hasExistingContent
          ? "Study Content Merged!"
          : "All Study Content Generated!",
        {
          id: toastId,
          description: hasExistingContent
            ? `Merged additional ${
                allContent.studyGuide ? "study guide sections, " : ""
              }${allContent.notes ? "notes, " : ""}${
                allContent.flashcards?.length || 0
              } flashcards with existing content!`
            : `Generated ${allContent.studyGuide ? "study guide, " : ""}${
                allContent.notes ? "notes, " : ""
              }${allContent.flashcards?.length || 0} flashcards${
                allContent.audioNarration ? ", and audio narration" : ""
              }!`,
        }
      );
      setActiveTab("studyContent");
    } catch (error) {
      console.error("Failed to generate study content:", error);
      toast.error("Failed to Generate Study Content", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    } finally {
      setIsGeneratingStudyContent(false);
      useFlashcardStore.getState().setIsProcessing(false);
    }
  };

  const handleGenerateDocumentNotes = async () => {
    if (!geminiApiKey || !activeProject || !activeProject.pdfContent) {
      toast.error("Cannot generate document notes", {
        description: "API key or document content is missing.",
      });
      return;
    }
    setIsGeneratingDocumentNotes(true);
    const toastId = toast.loading("Generating notes from document...");
    try {
      const aiService = createGeminiService(geminiApiKey);
      const notes = await aiService.generateAutomatedNotes(
        activeProject.pdfContent,
        "document"
      );
      setDocumentNotes(notes);
      toast.success("Document notes generated!", { id: toastId });
    } catch (error) {
      console.error("Error generating document notes:", error);
      toast.error("Failed to generate document notes", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGeneratingDocumentNotes(false);
    }
  };

  const handleGenerateVideoNotes = async () => {
    if (!geminiApiKey || !activeProject || !activeProject.originalTranscript) {
      toast.error("Cannot generate video notes", {
        description: "API key or video transcript is missing.",
      });
      return;
    }
    setIsGeneratingVideoNotes(true);
    const toastId = toast.loading("Generating notes from video transcript...");
    try {
      const aiService = createGeminiService(geminiApiKey);
      const notes = await aiService.generateAutomatedNotes(
        activeProject.originalTranscript,
        "video_transcript"
      );
      setVideoNotes(notes);
      toast.success("Video transcript notes generated!", { id: toastId });
    } catch (error) {
      console.error("Error generating video notes:", error);
      toast.error("Failed to generate video notes", {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGeneratingVideoNotes(false);
    }
  };

  const handleVideoUploadAndTranscribe = async (videoFile: File) => {
    if (!geminiApiKey || !activeProject) {
      toast.error("Cannot process video", {
        description: "API key or active project is missing.",
      });
      return;
    }
    setIsProcessingVideo(true);
    const toastId = toast.loading("Processing video...", {
      description: "Preparing video and initiating transcription.",
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const simulatedRawTranscript = `This is a simulated transcript for the video: ${videoFile.name}. It discusses key concepts like photosynthesis, cellular respiration, and the Krebs cycle. It also mentions important figures such as Dr. Emily Carter.`;
      toast.warning("Using SIMULATED video transcription", {
        description:
          "Full video transcription is a complex feature not implemented in this client-side version.",
        duration: 8000,
      });
      toast.info(
        "Transcription (simulated) complete. Formatting transcript...",
        { id: toastId }
      );
      const aiService = createGeminiService(geminiApiKey);
      let formattedTranscript = await aiService.formatTranscriptToMarkdown(
        simulatedRawTranscript
      );
      toast.info("Formatting complete. Linking concepts in transcript...", {
        id: toastId,
      });
      let linkedTranscript = await aiService.linkTranscriptConcepts(
        formattedTranscript
      );
      setVideoProcessingResult(
        videoFile.name,
        simulatedRawTranscript,
        linkedTranscript
      );
      toast.success("Video processed and transcript generated!", {
        id: toastId,
      });
      setActiveTab("video");
    } catch (error) {
      console.error("Error processing video:", error);
      toast.error("Failed to process video", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
      clearVideoProcessingResult();
    } finally {
      setIsProcessingVideo(false);
    }
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
          {activeProject.studyGuide && (
            <Button
              variant="outline"
              onClick={() => setGamificationEnabled(!gamificationEnabled)}
              title={
                gamificationEnabled
                  ? "Switch to Classic Tabbed View"
                  : "Switch to Gamified Roadmap View"
              }
            >
              {gamificationEnabled ? (
                <ListChecks className="mr-2 h-4 w-4" />
              ) : (
                <LayoutDashboard className="mr-2 h-4 w-4" />
              )}
              {gamificationEnabled ? "Classic View" : "Roadmap View"}
            </Button>
          )}
          <ShareProjectDialog projectId={activeProject.id} />
          <AppSettings />
        </div>
      </div>
      {gamificationEnabled && activeProject.studyGuide ? (
        <GamifiedRoadmapView project={activeProject} />
      ) : (
        <>
          {" "}
          {/* Start of Classic View Fragment */}
          <div className="mb-8 flex justify-center">
            <div className="border rounded-lg p-1 flex flex-wrap space-x-1">
              <TabButton
                isActive={activeTab === "upload"}
                onClick={() => setActiveTab("upload")}
                icon={<FileUp className="h-4 w-4" />}
                label="Upload & Process"
              />
              <TabButton
                isActive={activeTab === "video"}
                onClick={() => setActiveTab("video")}
                icon={<VideoIcon className="h-4 w-4" />}
                label="Lecture Video"
                disabled={isProcessingVideo}
              />
              <TabButton
                isActive={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
                icon={<FileTextIcon className="h-4 w-4" />}
                label="Automated Notes"
                disabled={
                  isGeneratingDocumentNotes ||
                  isGeneratingVideoNotes ||
                  (!activeProject.pdfContent &&
                    !activeProject.originalTranscript)
                }
              />
              <TabButton
                isActive={activeTab === "studyContent"}
                onClick={() => setActiveTab("studyContent")}
                icon={<BookCopy className="h-4 w-4" />}
                label="Study Content"
                disabled={
                  !activeProject.studyGuide &&
                  !isGeneratingStudyContent &&
                  !activeProject.formattedTranscript
                }
              />
              <TabButton
                isActive={activeTab === "generateFlashcards"}
                onClick={() => setActiveTab("generateFlashcards")}
                icon={<BookOpen className="h-4 w-4" />}
                label="Generate Flashcards"
                disabled={!activeProject.pdfContent}
              />
              <TabButton
                isActive={activeTab === "study"}
                onClick={() => setActiveTab("study")}
                icon={<Brain className="h-4 w-4" />}
                label="Study Flashcards"
                disabled={activeProject.flashcards.length === 0}
              />
              <TabButton
                isActive={activeTab === "list"}
                onClick={() => setActiveTab("list")}
                icon={<List className="h-4 w-4" />}
                label="View All Cards"
                disabled={activeProject.flashcards.length === 0}
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
                          Upload Documents
                        </CardTitle>
                        <CardDescription>
                          Upload PDF, DOCX, or TXT files to generate study
                          content and flashcards.
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activeProject.flashcards.length} cards in this project
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentUpload
                      onProcessingComplete={handleDocumentProcessingComplete}
                    />
                  </CardContent>
                </Card>
                <FlashcardImportExport />
              </div>
            )}

            {activeTab === "video" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <VideoIcon className="h-5 w-5 mr-2" />
                    Lecture Video Processing
                  </CardTitle>
                  <CardDescription>
                    Upload a lecture video to transcribe and process its
                    content.
                    {activeProject?.videoFileName &&
                      ` Currently viewing: ${activeProject.videoFileName}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!activeProject?.formattedTranscript &&
                    !isProcessingVideo && (
                      <VideoUpload
                        onUploadAndTranscribe={handleVideoUploadAndTranscribe}
                        isProcessingVideo={isProcessingVideo}
                      />
                    )}
                  {isProcessingVideo && (
                    <div className="space-y-2 text-center p-4 border rounded-md">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Video processing in progress...
                      </p>
                      <Progress
                        value={undefined}
                        className="mt-2 h-2 animate-pulse"
                      />
                    </div>
                  )}
                  {activeProject?.formattedTranscript && !isProcessingVideo && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Formatted Transcript
                      </h3>
                      <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm font-mono max-h-[60vh] overflow-auto">
                        {activeProject.formattedTranscript}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearVideoProcessingResult}
                        className="mt-4"
                      >
                        Upload New Video
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "notes" && activeProject && (
              <NotesView
                documentNotes={activeProject.documentNotes}
                videoNotes={activeProject.videoNotes}
                onGenerateDocumentNotes={handleGenerateDocumentNotes}
                onGenerateVideoNotes={handleGenerateVideoNotes}
                isGeneratingDocumentNotes={isGeneratingDocumentNotes}
                isGeneratingVideoNotes={isGeneratingVideoNotes}
                hasDocumentContent={!!activeProject.pdfContent}
                hasVideoTranscript={!!activeProject.originalTranscript}
              />
            )}

            {activeTab === "studyContent" && (
              <StudyContentView studyGuide={activeProject.studyGuide} />
            )}

            {activeTab === "generateFlashcards" && activeProject.pdfContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Generate Flashcards
                  </CardTitle>
                  <CardDescription>
                    Generate flashcards from the processed document content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FlashcardGenerator />
                </CardContent>
              </Card>
            )}

            {activeTab === "study" && <FlashcardSession />}

            {activeTab === "list" && <FlashcardList />}
          </div>
        </>
      )}{" "}
      {/* End of Conditional Rendering */}
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

function TabButton({
  isActive,
  onClick,
  icon,
  label,
  disabled,
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 flex items-center rounded-md transition-all ${
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
}
