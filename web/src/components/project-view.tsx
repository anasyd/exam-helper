"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFlashcardStore, Project as ProjectType } from "@/lib/store"; // Import Project type
import { DocumentUpload } from "@/components/document-upload";
import { FlashcardSession } from "@/components/flashcard-session";
import { FlashcardList } from "@/components/flashcard-list";
import { FlashcardImportExport } from "@/components/flashcard-import-export";
import { ShareProjectDialog } from "@/components/share-project-dialog";
import { AuthDropdown } from "@/components/auth/auth-dropdown";
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
  Brain,

  VideoIcon,
  FileTextIcon,
  LayoutDashboard,
  Flame,
  Zap,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { fetchProject } from "@/lib/api/projects";
import { generateFlashcards } from "@/lib/ai/features/flashcards";
import { generateAutomatedNotes } from "@/lib/ai/features/notes";
import {
  formatTranscriptToMarkdown,
  linkTranscriptConcepts,
} from "@/lib/ai/features/transcript";
import { generateAllContentTypes } from "@/lib/ai/features/generate-all";
import type { RouterDependencies } from "@/lib/ai/router";
import { VideoUpload } from "./video-upload";
import { NotesView } from "./notes-view";
import { toast } from "sonner";
import { TopicQuizView } from "@/components/topic-quiz-view";
import { Flashcard, useFlashcardStore as _storeRef } from "@/lib/store";

// Lazy-loads pdfContent from server if not in memory (excluded from localStorage)
async function ensurePdfContent(project: { id: string; pdfContent?: string | null }): Promise<string | null> {
  if (project.pdfContent) return project.pdfContent;
  try {
    const full = await fetchProject(project.id);
    if (full.pdfContent) {
      _storeRef.getState().setProjectContent(project.id, { pdfContent: full.pdfContent });
    }
    return full.pdfContent ?? null;
  } catch {
    return null;
  }
}

// GamifiedRoadmapView Implementation
function GamifiedRoadmapView({
  project: initialProject,
}: {
  project: ProjectType | null;
}) {
  // Use reactive store to get the most up-to-date project data
  const {
    markTopicAsComplete,
    addFlashcards,
    setStudyGuide,
    getActiveProject,
  } = useFlashcardStore();
  const providers = useFlashcardStore((s) => s.providers);
  const modelRouting = useFlashcardStore((s) => s.modelRouting);

  const routerDeps: RouterDependencies = useMemo(
    () => ({
      getSelection: (feature) =>
        modelRouting.overrides[feature] ?? modelRouting.default,
      getApiKey: (providerId) => providers[providerId].apiKey,
    }),
    [providers, modelRouting]
  );

  // Get the most current project state from the store instead of relying on props
  const project = getActiveProject() || initialProject;
  const [showQuizView, setShowQuizView] = useState(false);
  const [quizCards, setQuizCards] = useState<Flashcard[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [currentQuizContext, setCurrentQuizContext] = useState<{
    sectionIndex: number;
    topicIndex: number;
  } | null>(null);
  const [generatingMcqId, setGeneratingMcqId] = useState<string | null>(null);
  const [hasScrolledToCurrentItem, setHasScrolledToCurrentItem] =
    useState(false);

  // Reset scroll flag when component unmounts or project changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new rule in eslint-plugin-react-hooks@7 (Next 16 upgrade); refactor deferred
    setHasScrolledToCurrentItem(false);
  }, [project?.id]);

  // Auto-scroll to current item logic
  useEffect(() => {
    if (!project || !project.studyGuide) return;
    const studyGuide = project.studyGuide;

    if (!hasScrolledToCurrentItem && studyGuide && studyGuide.sections) {
      // Find the current item to scroll to
      let targetElementId: string | null = null;
      let overallPreviousCompleted = true;

      // Look for first incomplete section or topic that needs attention
      for (
        let sectionIndex = 0;
        sectionIndex < studyGuide.sections.length;
        sectionIndex++
      ) {
        const section = studyGuide.sections[sectionIndex];
        const isSectionLocked = !overallPreviousCompleted;

        if (isSectionLocked) break;

        // Check if this section is incomplete
        if (!section.isCompleted) {
          if (!section.topics || section.topics.length === 0) {
            // Section without topics - scroll to it
            targetElementId = `section-${sectionIndex}`;
            break;
          }

          // Check topics within this section
          let previousTopicCompleted = true;
          for (
            let topicIndex = 0;
            topicIndex < section.topics.length;
            topicIndex++
          ) {
            const topic = section.topics[topicIndex];
            const isTopicLocked = !previousTopicCompleted;

            if (isTopicLocked) break;

            if (!topic.isCompleted) {
              // Found an incomplete topic
              const topicMcqs = project.flashcards.filter(
                (f) =>
                  f.sourceSectionTitle === section.title &&
                  f.sourceTopicTitle === topic.title
              );
              const hasTopicMcqs = topicMcqs.length > 0;

              if (hasTopicMcqs) {
                // This topic can be attempted - scroll to it
                targetElementId = `topic-${sectionIndex}-${topicIndex}`;
                break;
              } else {
                // This topic needs MCQs generated - scroll to it
                targetElementId = `topic-${sectionIndex}-${topicIndex}`;
                break;
              }
            }

            previousTopicCompleted = !!topic.isCompleted;
          }

          if (targetElementId) break;

          // If all topics are complete, but section isn't marked complete
          if (
            section.topics.every((t) => t.isCompleted) &&
            !section.isCompleted
          ) {
            targetElementId = `section-${sectionIndex}`;
            break;
          }
        }

        // Update overall completion status
        overallPreviousCompleted =
          !!section.isCompleted ||
          (section.topics && section.topics.length > 0
            ? section.topics.every((t) => !!t.isCompleted)
            : true);
      }

      // Scroll to the target element
      if (targetElementId) {
        setTimeout(() => {
          const element = document.getElementById(targetElementId!);
          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });

          }
        }, 500); // Small delay to ensure DOM is fully rendered
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect -- new rule in eslint-plugin-react-hooks@7 (Next 16 upgrade); refactor deferred
      setHasScrolledToCurrentItem(true);
    }
  }, [hasScrolledToCurrentItem, project]);

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

    const sectionTitle = studyGuide.sections[sectionIndex].title;
    const cardsForTopic = flashcards.filter(
      (card) =>
        card.sourceSectionTitle === sectionTitle &&
        card.sourceTopicTitle === topic.title
    );

    if (cardsForTopic.length > 0) {
      // Mix in review cards from other topics (up to 5, capped at 15 total)
      const reviewPool = flashcards.filter(
        (card) =>
          !(card.sourceSectionTitle === sectionTitle && card.sourceTopicTitle === topic.title)
      );
      const reviewCount = Math.min(reviewPool.length, Math.max(0, 15 - cardsForTopic.length));
      const reviewCards = [...reviewPool].sort(() => Math.random() - 0.5).slice(0, reviewCount);
      const combined = [...cardsForTopic, ...reviewCards].sort(() => Math.random() - 0.5);

      setQuizCards(combined);
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

    if (!project) {
      toast.error("Cannot generate MCQs", { description: "No active project." });
      return;
    }
    const pdfContent = await ensurePdfContent(project);
    if (!pdfContent) {
      toast.error("Cannot generate MCQs", { description: "Document content is missing." });
      return;
    }

    // Check if user has API key set for the default provider
    const defaultProviderId = modelRouting.default.providerId;
    if (!providers[defaultProviderId].apiKey) {
      toast.error("Cannot generate MCQs", {
        description: `Configure a ${defaultProviderId} API key in Settings.`,
      });
      return;
    }

    const id = isSection
      ? `section-mcq-${sectionIdx}`
      : `topic-mcq-${sectionIdx}-${topicIdx}`;
    setGeneratingMcqId(id);

    // Handle section-level generation (generate for all subtopics)
    if (isSection) {
      const section = studyGuide.sections[sectionIdx];
      if (!section || !section.topics || section.topics.length === 0) {
        toast.error("No subtopics found in this section to generate MCQs for.");
        setGeneratingMcqId(null);
        return;
      }

      const toastId = toast.loading(
        `Generating MCQs for all ${section.topics.length} subtopics in "${title}"...`
      );
      let totalGenerated = 0;
      let failures = 0;

      try {
        // Generate MCQs for each subtopic
        for (
          let topicIndex = 0;
          topicIndex < section.topics.length;
          topicIndex++
        ) {
          const topic = section.topics[topicIndex];

          try {
            console.log(`Generating MCQs for subtopic: ${topic.title}`);

            const sectionTitle = title; // Section title
            const topicTitle = topic.title;

            const numCardsToGenerate = 10;

            const newMcqs = await generateFlashcards(
              { kind: "text", text: topic.content || pdfContent },
              numCardsToGenerate,
              routerDeps
            );

            if (newMcqs && newMcqs.length > 0) {
              const countAdded = addFlashcards(
                newMcqs,
                null,
                sectionTitle,
                topicTitle
              );
              totalGenerated += countAdded;
              console.log(`Generated ${countAdded} MCQs for "${topicTitle}"`);
            }

            // Small delay between generations to avoid rate limits
            if (topicIndex < section.topics.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(
              `Failed to generate MCQs for topic "${topic.title}":`,
              error
            );
            failures++;
          }
        }

        // Update the study guide to mark all topics as having MCQs generated
        if (project && project.studyGuide) {
          const newStudyGuide = JSON.parse(JSON.stringify(project.studyGuide));
          const currentSection = newStudyGuide.sections[sectionIdx];
          if (currentSection && currentSection.topics) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing, deferred
            currentSection.topics.forEach((topic: any) => {
              topic.mcqsGenerated = true;
            });
            currentSection.mcqsGenerated = true; // Mark section as completed too
          }
          setStudyGuide(newStudyGuide);
        }

        // Show final result
        toast.success(
          `Generated MCQs for ${section.topics.length - failures} subtopics!`,
          {
            id: toastId,
            description: `Total: ${totalGenerated} MCQs generated. ${
              failures > 0 ? `${failures} subtopics failed.` : ""
            }`,
          }
        );
      } catch (error) {
        console.error("Error in bulk MCQ generation:", error);
        toast.error(`Failed to generate MCQs for subtopics`, {
          id: toastId,
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setGeneratingMcqId(null);
      }
      return;
    }

    // Handle individual topic generation
    const toastId = toast.loading(`Generating MCQs for "${title}"...`);

    try {
      const sectionTitle = isSection
        ? title
        : studyGuide.sections[sectionIdx]?.title || "Unknown Section";
      const topicTitle = isSection ? undefined : title;

      const numCardsToGenerate = 10;

      const newMcqs = await generateFlashcards(
        { kind: "text", text: contentToUse || pdfContent },
        numCardsToGenerate,
        routerDeps
      );

      if (newMcqs && newMcqs.length > 0) {
        console.log("MCQ Generation Successful:", {
          count: newMcqs.length,
          title,
          sectionTitle,
          topicTitle,
          firstMcq: newMcqs[0]?.question.slice(0, 50) + "...",
        });

        console.log("Adding MCQs with parameters:", {
          sectionTitle,
          topicTitle,
          isSection,
          mcqsLength: newMcqs.length,
        });

        const countAdded = addFlashcards(
          newMcqs,
          null, // No general source content hash for topic MCQs specifically
          sectionTitle,
          topicTitle
        );

        console.log("MCQs added to store:", { countAdded, title });

        // Debug: Check what was actually added
        const activeProject = useFlashcardStore.getState().getActiveProject();
        if (activeProject) {
          const addedMcqs = activeProject.flashcards.filter(
            (f) =>
              f.sourceSectionTitle === sectionTitle &&
              f.sourceTopicTitle === topicTitle
          );
          console.log("Verification - MCQs in store with matching titles:", {
            count: addedMcqs.length,
            sectionTitle,
            topicTitle,
            sample: addedMcqs.slice(0, 2).map((f) => ({
              question: f.question.slice(0, 30),
              sourceSectionTitle: f.sourceSectionTitle,
              sourceTopicTitle: f.sourceTopicTitle,
            })),
          });
        }

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

  const totalTopics = studyGuide.sections.reduce(
    (acc, s) => acc + (s.topics?.length ?? 0),
    0
  );
  const completedTopics = studyGuide.sections.reduce(
    (acc, s) => acc + (s.topics?.filter((t) => t.isCompleted).length ?? 0),
    0
  );

  return (
    <div className="pb-16">
      {/* Stats bar */}
      <div className="flex items-center justify-center gap-10 mb-10 py-5 rounded-2xl bg-muted/50 border border-border/40">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-amber-500">{xp || 0}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">XP</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className="text-3xl font-extrabold text-foreground">{completedTopics}<span className="text-muted-foreground text-lg font-normal">/{totalTopics}</span></p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Topics</p>
        </div>
        {completedTopics > 0 && (
          <>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-green-500">{Math.round((completedTopics / totalTopics) * 100)}%</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Done</p>
            </div>
          </>
        )}
      </div>

      {/* Path */}
      <div className="relative mx-auto" style={{ maxWidth: 340 }}>
        {/* Vertical path line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border/60 -translate-x-1/2 pointer-events-none" />

        {studyGuide.sections.map((section, sectionIndex) => {
          const isCurrentSectionLocked = !overallPreviousNodeCompleted;
          const currentSectionDisplayCompleted =
            !!section.isCompleted ||
            (section.topics?.length
              ? section.topics.every((t) => !!t.isCompleted)
              : false);

          let previousTopicInSectionCompleted = true;

          const sectionEl = (
            <div key={`section-${sectionIndex}`} id={`section-${sectionIndex}`}>
              {/* Section banner pill */}
              <div className="relative z-10 flex justify-center my-6">
                <div
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border shadow-sm select-none
                    ${isCurrentSectionLocked
                      ? "bg-muted text-muted-foreground border-border"
                      : currentSectionDisplayCompleted
                      ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40"
                      : "bg-primary/10 text-primary border-primary/30"
                    }`}
                >
                  {isCurrentSectionLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : currentSectionDisplayCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {section.title}
                  {section.xpAwardedOnCompletion && !currentSectionDisplayCompleted && !isCurrentSectionLocked && (
                    <span className="ml-1 text-xs opacity-70">+{section.xpAwardedOnCompletion} XP</span>
                  )}
                </div>
              </div>

              {/* Topics */}
              {!isCurrentSectionLocked && section.topics?.map((topic, topicIndex) => {
                const isTopicLocked = !previousTopicInSectionCompleted;
                const topicCompleted = !!topic.isCompleted;
                const topicMcqs = project.flashcards.filter(
                  (f) =>
                    f.sourceSectionTitle === section.title &&
                    f.sourceTopicTitle === topic.title
                );
                const hasMcqs = topicMcqs.length > 0;
                const canAttempt = !isTopicLocked && !topicCompleted && hasMcqs;
                const isGeneratingThis =
                  generatingMcqId === `topic-mcq-${sectionIndex}-${topicIndex}`;

                if (!isTopicLocked) {
                  previousTopicInSectionCompleted = topicCompleted;
                }

                return (
                  <div
                    key={`topic-${sectionIndex}-${topicIndex}`}
                    id={`topic-${sectionIndex}-${topicIndex}`}
                    className="relative flex flex-col items-center mb-10"
                  >
                    {/* Circle node */}
                    <button
                      disabled={isTopicLocked || topicCompleted}
                      onClick={() =>
                        canAttempt
                          ? handleTopicClick(sectionIndex, topicIndex, false)
                          : isTopicLocked
                          ? handleTopicClick(sectionIndex, topicIndex, true)
                          : undefined
                      }
                      className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                        ${isTopicLocked
                          ? "bg-muted border-border cursor-not-allowed"
                          : topicCompleted
                          ? "bg-green-500 border-green-700 shadow-green-500/30"
                          : canAttempt
                          ? "bg-amber-500 border-amber-700 shadow-amber-500/40 hover:scale-110 hover:shadow-amber-500/60 cursor-pointer"
                          : "bg-muted/80 border-border/60 opacity-70"
                        }`}
                    >
                      {isTopicLocked ? (
                        <Lock className="h-7 w-7 text-muted-foreground" />
                      ) : topicCompleted ? (
                        <CheckCircle className="h-8 w-8 text-white" />
                      ) : canAttempt ? (
                        <Brain className="h-8 w-8 text-white" />
                      ) : (
                        <Zap className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>

                    {/* Label */}
                    <div className="mt-3 text-center px-2" style={{ maxWidth: 160 }}>
                      <p className={`text-sm font-semibold leading-snug ${isTopicLocked ? "text-muted-foreground" : "text-foreground"}`}>
                        {topic.title}
                      </p>
                      {!isTopicLocked && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hasMcqs ? `${topicMcqs.length} questions` : "No questions yet"}
                          {topic.xpAwardedOnCompletion && !topicCompleted && (
                            <span className="ml-1 text-amber-500 font-medium">· +{topic.xpAwardedOnCompletion} XP</span>
                          )}
                          {topicCompleted && topic.xpAwardedOnCompletion && (
                            <span className="ml-1 text-green-500 font-medium">· +{topic.xpAwardedOnCompletion} XP earned</span>
                          )}
                        </p>
                      )}
                      {/* Generate button for topics without MCQs */}
                      {!isTopicLocked && !topicCompleted && !hasMcqs && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateMCQs(
                              topic.content ?? "",
                              topic.title,
                              false,
                              sectionIndex,
                              topicIndex
                            );
                          }}
                          disabled={isGeneratingThis}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium border border-primary/20 transition-colors disabled:opacity-50"
                        >
                          {isGeneratingThis ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                          {isGeneratingThis ? "Generating…" : "Generate questions"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );

          if (!isCurrentSectionLocked) {
            overallPreviousNodeCompleted = currentSectionDisplayCompleted;
          }

          return sectionEl;
        })}

        {/* End of path marker */}
        <div className="relative z-10 flex justify-center mt-4 mb-8">
          <div className="w-6 h-6 rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}

const VALID_TABS = ["study", "guide", "notes", "source", "settings"] as const;

export function ProjectView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    getActiveProject,
    setActiveProject,
    setStudyGuide,
    setVideoProcessingResult,
    clearVideoProcessingResult,
    setDocumentNotes,
    setVideoNotes,
    setDocumentFileName,
    setProjectContent,
    currentStreak,
  } = useFlashcardStore();
  const providers = useFlashcardStore((s) => s.providers);
  const modelRouting = useFlashcardStore((s) => s.modelRouting);

  const routerDeps: RouterDependencies = useMemo(
    () => ({
      getSelection: (feature) =>
        modelRouting.overrides[feature] ?? modelRouting.default,
      getApiKey: (providerId) => providers[providerId].apiKey,
    }),
    [providers, modelRouting]
  );

  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && (VALID_TABS as readonly string[]).includes(urlTab)) return urlTab;
    const ap = getActiveProject();
    return ap && ap.studyGuide ? "guide" : "source";
  });

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const [showAllCards, setShowAllCards] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isGeneratingStudyContent, setIsGeneratingStudyContent] =
    useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isGeneratingDocumentNotes, setIsGeneratingDocumentNotes] =
    useState(false);
  const [isGeneratingVideoNotes, setIsGeneratingVideoNotes] = useState(false);
  const activeProject = getActiveProject();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new rule in eslint-plugin-react-hooks@7 (Next 16 upgrade); refactor deferred
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !activeProject) {
      router.push("/app");
    }
  }, [activeProject, router, mounted]);

  if (!mounted || !activeProject) {
    return null;
  }

  const handleBackToProjects = () => {
    setActiveProject(null);
    router.push("/app");
  };

  const handleDocumentProcessingComplete = async (documentText: string, fileName: string) => {
    const defaultProviderId = modelRouting.default.providerId;
    if (!providers[defaultProviderId].apiKey) {
      toast.error("Missing API Key", {
        description: `Configure a ${defaultProviderId} API key in Settings.`,
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
      useFlashcardStore.getState().appendDocumentContent(documentText);
    } else {
      useFlashcardStore.getState().setDocumentContent(documentText);
    }
    if (fileName) setDocumentFileName(fileName);
    setIsGeneratingStudyContent(true);
    useFlashcardStore.getState().setIsProcessing(true);
    const toastId = toast.loading("Generating All Study Content...", {
      description:
        "AI is generating notes, flashcards, study guide, and audio...",
    });
    try {
      // Generate all content types automatically
      const allContent = await generateAllContentTypes(
        { kind: "text", text: documentText },
        {
          generateFlashcards: true,
          generateNotes: true,
          generateStudyGuide: true,
          flashcardCount: 15,
        },
        routerDeps
      );

      // Store all generated content intelligently
      if (allContent.studyGuide) {
        if (hasExistingContent && activeProject?.studyGuide) {
          // Merge with existing study guide
          useFlashcardStore
            .getState()
            .mergeStudyGuide(allContent.studyGuide);
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
              }${allContent.flashcards?.length || 0} flashcards!`,
        }
      );
      switchTab("guide");
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
    const defaultProviderId = modelRouting.default.providerId;
    if (!providers[defaultProviderId].apiKey || !activeProject) {
      toast.error("Cannot generate document notes", {
        description: "API key or document content is missing.",
      });
      return;
    }
    const pdfContent = await ensurePdfContent(activeProject);
    if (!pdfContent) {
      toast.error("Cannot generate document notes", { description: "Document content is missing." });
      return;
    }
    setIsGeneratingDocumentNotes(true);
    const toastId = toast.loading("Generating notes from document...");
    try {
      const notes = await generateAutomatedNotes(
        { kind: "text", text: pdfContent },
        routerDeps
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
    const defaultProviderId = modelRouting.default.providerId;
    if (
      !providers[defaultProviderId].apiKey ||
      !activeProject ||
      !activeProject.originalTranscript
    ) {
      toast.error("Cannot generate video notes", {
        description: "API key or video transcript is missing.",
      });
      return;
    }
    setIsGeneratingVideoNotes(true);
    const toastId = toast.loading("Generating notes from video transcript...");
    try {
      const notes = await generateAutomatedNotes(
        { kind: "text", text: activeProject.originalTranscript },
        routerDeps
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
    const defaultProviderId = modelRouting.default.providerId;
    if (!providers[defaultProviderId].apiKey || !activeProject) {
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
      const formattedTranscript = await formatTranscriptToMarkdown(
        simulatedRawTranscript,
        routerDeps
      );
      toast.info("Formatting complete. Linking concepts in transcript...", {
        id: toastId,
      });
      const linkedTranscript = await linkTranscriptConcepts(
        formattedTranscript,
        routerDeps
      );
      setVideoProcessingResult(
        videoFile.name,
        simulatedRawTranscript,
        linkedTranscript
      );
      toast.success("Video processed and transcript generated!", {
        id: toastId,
      });
      switchTab("video");
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
    <div className="min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Left: back + project name */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                onClick={handleBackToProjects}
              >
                <span className="text-sm">Projects</span>
              </Button>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <h1 className="font-semibold truncate text-sm sm:text-base">{activeProject.name}</h1>
            </div>
            {/* Right: stats + actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                {currentStreak > 0 && (
                  <div className="flex items-center text-orange-500">
                    <Flame className="h-4 w-4 mr-0.5" />
                    <span className="font-bold">{currentStreak}</span>
                  </div>
                )}
                <div className="font-bold text-amber-500">
                  {activeProject.xp || 0} XP
                </div>
              </div>
              <AuthDropdown />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto py-6 px-4">
        {/* Tab bar */}
        <div className="mb-6 flex justify-center">
          <div className="border rounded-full p-1 inline-flex overflow-x-auto scrollbar-none gap-1">
            <TabButton
              isActive={activeTab === "guide"}
              onClick={() => switchTab("guide")}
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Roadmap"
              disabled={!activeProject.studyGuide && !isGeneratingStudyContent}
            />
            <TabButton
              isActive={activeTab === "study"}
              onClick={() => switchTab("study")}
              icon={<Brain className="h-4 w-4" />}
              label="Flashcards"
            />
            <TabButton
              isActive={activeTab === "notes"}
              onClick={() => switchTab("notes")}
              icon={<FileTextIcon className="h-4 w-4" />}
              label="Notes"
              disabled={!activeProject.pdfContent && !activeProject.originalTranscript}
            />
            <TabButton
              isActive={activeTab === "source"}
              onClick={() => switchTab("source")}
              icon={<FileUp className="h-4 w-4" />}
              label="Source"
            />
            <TabButton
              isActive={activeTab === "settings"}
              onClick={() => switchTab("settings")}
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Settings"
            />
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-4xl mx-auto" key={activeTab} style={{ animation: "fadeIn 0.18s ease" }}>

          {/* ── Study ── */}
          {activeTab === "study" && (
            <div className="space-y-8">
              <FlashcardSession />
              {activeProject.flashcards.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    onClick={() => setShowAllCards(!showAllCards)}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showAllCards ? "rotate-180" : ""}`}
                    />
                    {showAllCards ? "Hide" : "Show"} all cards ({activeProject.flashcards.length})
                  </button>
                  {showAllCards && <FlashcardList />}
                </div>
              )}
            </div>
          )}

          {/* ── Roadmap ── */}
          {activeTab === "guide" && (
            <div>
              {isGeneratingStudyContent && (
                <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating roadmap…
                </div>
              )}
              {activeProject.studyGuide ? (
                <GamifiedRoadmapView
                  project={activeProject}
                  key="roadmap"
                />
              ) : !isGeneratingStudyContent ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Upload a document to generate your learning roadmap.
                </div>
              ) : null}
            </div>
          )}

          {/* ── Notes ── */}
          {activeTab === "notes" && (
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

          {/* ── Source ── */}
          {activeTab === "source" && (
            <div className="space-y-6">
              {/* Document upload */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileUp className="h-4 w-4" />
                        Document
                      </CardTitle>
                      <CardDescription className="mt-1">
                        PDF, DOCX, or TXT — AI generates flashcards, notes and
                        study guide automatically.
                      </CardDescription>
                      {activeProject.documentFileName && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <FileTextIcon className="h-3 w-3" />
                          Loaded: {activeProject.documentFileName}
                          {activeProject.documentFileId && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000"}/api/files/${activeProject.documentFileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 underline hover:text-foreground"
                            >
                              view
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                    {isGeneratingStudyContent && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Processing…
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <DocumentUpload
                    onProcessingComplete={handleDocumentProcessingComplete}
                    projectId={activeProject?.id}
                  />
                </CardContent>
              </Card>

              {/* Video upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <VideoIcon className="h-4 w-4" />
                    Lecture Video
                  </CardTitle>
                  <CardDescription>
                    {activeProject.videoFileName
                      ? `Loaded: ${activeProject.videoFileName}`
                      : "Upload a lecture video to transcribe and process."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!activeProject.formattedTranscript && !isProcessingVideo && (
                    <VideoUpload
                      onUploadAndTranscribe={handleVideoUploadAndTranscribe}
                      isProcessingVideo={isProcessingVideo}
                    />
                  )}
                  {isProcessingVideo && (
                    <div className="space-y-2 text-center p-4 border rounded-md">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Processing video…
                      </p>
                      <Progress value={undefined} className="mt-2 h-2 animate-pulse" />
                    </div>
                  )}
                  {activeProject.formattedTranscript && !isProcessingVideo && (
                    <div className="space-y-3">
                      <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm font-mono max-h-[50vh] overflow-auto">
                        {activeProject.formattedTranscript}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearVideoProcessingResult}
                      >
                        Replace video
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Settings ── */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <FlashcardImportExport />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Share Project</CardTitle>
                  <CardDescription>
                    Generate a shareable link anyone can use to view this project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ShareProjectDialog projectId={activeProject.id} />
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
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
      className={`px-3 py-2 flex items-center rounded-full transition-all whitespace-nowrap flex-shrink-0 text-sm ${
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );
}
