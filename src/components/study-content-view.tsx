"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, StopCircle, Brain, Zap, Loader2 } from "lucide-react";
import { StudyGuide, StudySection, StudyTopic, createGeminiService, FlashcardData } from "@/lib/ai-service";
import { useFlashcardStore } from "@/lib/store"; // Added
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface StudyContentViewProps {
  studyGuide: StudyGuide | null | undefined;
}

import { TopicQuizView } from "./topic-quiz-view"; // Added

export function StudyContentView({ studyGuide }: StudyContentViewProps) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [generatingMcqId, setGeneratingMcqId] = useState<string | null>(null);
  const [showQuizView, setShowQuizView] = useState(false); // Added
  const [quizCards, setQuizCards] = useState<Flashcard[]>([]); // Added
  const [quizTitle, setQuizTitle] = useState(""); // Added

  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  const {
    geminiApiKey,
    addFlashcards,
    getActiveProject,
    getDuplicateQuestionCount,
    setStudyGuide,
    markTopicAsComplete, // Added
  } = useFlashcardStore();
  const activeProject = getActiveProject();

  useEffect(() => {
    return () => {
      if (synth && synth.speaking) {
        synth.cancel();
      }
      setCurrentlyPlaying(null);
    };
  }, [studyGuide, synth]);

  const getMcqCountForSource = (sectionTitle: string, topicTitle?: string): number => {
    if (!activeProject) return 0;
    return activeProject.flashcards.filter(
      (card) =>
        card.sourceSectionTitle === sectionTitle &&
        (topicTitle ? card.sourceTopicTitle === topicTitle : !card.sourceTopicTitle)
    ).length;
  };

  // Helper to check if MCQs are marked as generated in the study guide
  const areMcqsGeneratedForSource = (sectionIdx: number, topicIdx?: number): boolean => {
    if (!studyGuide || !studyGuide.sections[sectionIdx]) return false;
    const section = studyGuide.sections[sectionIdx];
    if (topicIdx === undefined || topicIdx === null) { // Checking for a section
      return !!section.mcqsGenerated;
    }
    // Checking for a topic
    return !!(section.topics && section.topics[topicIdx] && section.topics[topicIdx].mcqsGenerated);
  };


  const handleGenerateMCQs = async (
    contentToUse: string,
    title: string,
    isSection: boolean, // True if section, false if topic
    sectionIdx: number,
    topicIdx?: number
  ) => {
    if (!geminiApiKey || !activeProject || !activeProject.pdfContent) {
      toast.error("Cannot generate MCQs", {
        description: "API key or project document content is missing.",
      });
      return;
    }

    const id = isSection ? `section-mcq-${sectionIdx}` : `topic-mcq-${sectionIdx}-${topicIdx}`;
    setGeneratingMcqId(id);
    const toastId = toast.loading(`Generating MCQs for "${title}"...`);

    try {
      const aiService = createGeminiService(geminiApiKey);
      const sectionTitle = isSection ? title : studyGuide?.sections[sectionIdx]?.title || "Unknown Section";
      const topicTitle = isSection ? undefined : title;

      // Get existing questions for this specific topic/section to avoid duplicates
      const existingTopicFlashcards = activeProject.flashcards.filter(
        (card) =>
          card.sourceSectionTitle === sectionTitle &&
          (isSection ? !card.sourceTopicTitle : card.sourceTopicTitle === topicTitle)
      ).map(card => ({ question: card.question, answer: card.answer }));


      const numCardsToGenerate = 5; // Or make this configurable

      const newMcqs = await aiService.generateFlashcards(
        activeProject.pdfContent, // Main document content for context
        numCardsToGenerate,
        existingTopicFlashcards,
        title, // This is the specific title for the prompt context (section or topic)
        contentToUse // This is the specific content for the prompt context
      );

      if (newMcqs && newMcqs.length > 0) {
        const countAdded = addFlashcards(
          newMcqs,
          null, // No general source content hash for topic MCQs specifically
          sectionTitle,
          topicTitle
        );
        toast.success(`Generated ${countAdded} new MCQs for "${title}"!`, { id: toastId });

        // Update mcqsGenerated flag in the studyGuide
        if (activeProject && activeProject.studyGuide) {
          const newStudyGuide = JSON.parse(JSON.stringify(activeProject.studyGuide)); // Deep copy
          const currentSection = newStudyGuide.sections[sectionIdx];
          if (isSection && currentSection) {
            currentSection.mcqsGenerated = true;
          } else if (!isSection && currentSection && currentSection.topics && topicIdx !== undefined && currentSection.topics[topicIdx]) {
            currentSection.topics[topicIdx].mcqsGenerated = true;
          }
          setStudyGuide(newStudyGuide);
        }

      } else {
        toast.info(`No new MCQs generated for "${title}". They might be duplicates or generation failed.`, { id: toastId });
      }
    } catch (error) {
      console.error(`Error generating MCQs for ${title}:`, error);
      toast.error(`Failed to generate MCQs for "${title}"`, {
        id: toastId,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setGeneratingMcqId(null);
    }
  };

  const handlePracticeMCQs = (sectionTitle: string, sectionIndex: number, topicTitle?: string, topicIndex?: number) => {
    if (!activeProject) return;
    const cards = activeProject.flashcards.filter(
      (card) =>
        card.sourceSectionTitle === sectionTitle &&
        (topicTitle ? card.sourceTopicTitle === topicTitle : !card.sourceTopicTitle)
    );
    if (cards.length > 0) {
      setQuizCards(cards);
      // Store context for when quiz is complete
      setQuizContext({ sectionTitle, sectionIndex, topicTitle, topicIndex });
      setQuizTitle(topicTitle || sectionTitle);
      setShowQuizView(true);
    } else {
      toast.info("No MCQs found for this specific topic/section to practice.");
    }
  };

  // State to store context for the currently active quiz
  const [quizContext, setQuizContext] = useState<{sectionTitle: string, sectionIndex: number, topicTitle?: string, topicIndex?: number} | null>(null);


  const handlePlaySummary = (text: string | undefined, id: string) => {
    if (!synth || !text) return;

    if (synth.speaking && currentlyPlaying === id) {
      synth.cancel(); // Stop current speech
      setCurrentlyPlaying(null);
      return;
    }

    if (synth.speaking) {
      synth.cancel(); // Stop any other speech
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setCurrentlyPlaying(id);
    utterance.onend = () => setCurrentlyPlaying(null);
    utterance.onerror = (event) => {
      console.error("SpeechSynthesisUtterance.onerror", event);
      setCurrentlyPlaying(null);
      toast.error("Audio Playback Error", { description: "Could not play audio summary."});
    }
    synth.speak(utterance);
  };

  if (showQuizView) {
    return (
      <TopicQuizView
        cardsToPractice={quizCards}
        quizTitle={quizTitle}
        onQuizComplete={(passed) => {
          setShowQuizView(false);
          if (passed && quizContext && quizContext.topicIndex !== undefined) {
            markTopicAsComplete(quizContext.sectionIndex, quizContext.topicIndex);
          } else if (passed && quizContext && quizContext.topicIndex === undefined) {
            // This case implies a section-level quiz was passed.
            // If sections can be directly marked complete or if all topics become complete,
            // the markTopicAsComplete logic (which checks section completion) handles it.
            // For now, we only explicitly mark topics. Section completion is implicit.
            console.log("Section quiz passed, section completion handled by topic completions.");
          }
          setQuizContext(null); // Clear context
        }}
      />
    );
  }

  if (!studyGuide) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Study Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No study content has been generated yet. Upload documents and
            generate content to see it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{studyGuide.title || "Study Guide"}</CardTitle>
      </CardHeader>
      <CardContent>
        {studyGuide.sections && studyGuide.sections.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-4">
            {studyGuide.sections.map((section, sectionIndex) => (
              <AccordionItem
                value={`section-${sectionIndex}`}
                key={sectionIndex}
                className="border rounded-lg"
              >
                <AccordionTrigger className="p-4 hover:no-underline bg-slate-50 dark:bg-slate-800 rounded-t-lg text-left">
                  <div className="flex justify-between items-center w-full">
                    <h3 className="text-lg font-semibold flex-grow mr-2">{section.title}</h3>
                    {section.audioSummaryText && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent accordion from toggling
                          handlePlaySummary(section.audioSummaryText, `section-${sectionIndex}`);
                        }}
                        className="ml-2 flex-shrink-0"
                        aria-label={currentlyPlaying === `section-${sectionIndex}` ? "Stop summary" : "Play summary for section"}
                      >
                        {currentlyPlaying === `section-${sectionIndex}` ? (
                          <StopCircle className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-2 border-t">
                  <div className="flex justify-end mb-2">
                    {areMcqsGeneratedForSource(sectionIndex) ? (
                       <Button variant="outline" size="sm" onClick={() => handlePracticeMCQs(section.title, sectionIndex)}
                        disabled={getMcqCountForSource(section.title) === 0}
                       >
                        <Brain className="mr-2 h-4 w-4" />
                        Practice {getMcqCountForSource(section.title) > 0 ? `${getMcqCountForSource(section.title)} MCQs` : "MCQs"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateMCQs(section.content, section.title, true, sectionIndex)}
                        disabled={generatingMcqId === `section-mcq-${sectionIndex}`}
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
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                  {section.topics && section.topics.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-md font-semibold mb-2">Key Topics:</h4>
                      <Accordion type="multiple" className="w-full space-y-2">
                        {section.topics.map((topic, topicIndex) => (
                          <AccordionItem
                            value={`section-${sectionIndex}-topic-${topicIndex}`}
                            key={topicIndex}
                            className="border rounded-md bg-slate-50/50 dark:bg-slate-900/50"
                          >
                            <AccordionTrigger className="p-3 hover:no-underline text-left">
                              <div className="flex justify-between items-center w-full">
                                <h5 className="text-sm font-medium flex-grow mr-2">
                                  {topic.title}
                                </h5>
                                {topic.audioSummaryText && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaySummary(topic.audioSummaryText,`section-${sectionIndex}-topic-${topicIndex}`);
                                    }}
                                    className="ml-2 flex-shrink-0 p-1"
                                    aria-label={currentlyPlaying === `section-${sectionIndex}-topic-${topicIndex}` ? "Stop summary" : "Play summary for topic"}
                                  >
                                    {currentlyPlaying === `section-${sectionIndex}-topic-${topicIndex}` ? (
                                      <StopCircle className="h-4 w-4" />
                                    ) : (
                                      <Volume2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-3 pt-1 border-t">
                               <div className="flex justify-end mb-2">
                                {areMcqsGeneratedForSource(sectionIndex, topicIndex) ? (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handlePracticeMCQs(section.title, sectionIndex, topic.title, topicIndex)}
                                    disabled={getMcqCountForSource(section.title, topic.title) === 0}
                                  >
                                    <Brain className="mr-1 h-3 w-3" />
                                    Practice {getMcqCountForSource(section.title, topic.title) > 0 ? `${getMcqCountForSource(section.title, topic.title)} MCQs` : "MCQs"}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleGenerateMCQs(topic.content, topic.title, false, sectionIndex, topicIndex)}
                                    disabled={generatingMcqId === `topic-mcq-${sectionIndex}-${topicIndex}`}
                                  >
                                    {generatingMcqId === `topic-mcq-${sectionIndex}-${topicIndex}` ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Zap className="mr-1 h-3 w-3" />
                                    )}
                                    Generate MCQs
                                  </Button>
                                )}
                              </div>
                              <div
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: topic.content }}
                              />
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-muted-foreground">
            The generated study guide has no sections.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
