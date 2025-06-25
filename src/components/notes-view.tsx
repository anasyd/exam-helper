"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface NotesViewProps {
  documentNotes: string | null | undefined;
  videoNotes: string | null | undefined;
  onGenerateDocumentNotes: () => Promise<void>;
  onGenerateVideoNotes: () => Promise<void>;
  isGeneratingDocumentNotes: boolean;
  isGeneratingVideoNotes: boolean;
  hasDocumentContent: boolean;
  hasVideoTranscript: boolean;
}

export function NotesView({
  documentNotes,
  videoNotes,
  onGenerateDocumentNotes,
  onGenerateVideoNotes,
  isGeneratingDocumentNotes,
  isGeneratingVideoNotes,
  hasDocumentContent,
  hasVideoTranscript,
}: NotesViewProps) {
  const [activeNoteType, setActiveNoteType] = useState<
    "document" | "video" | null
  >(null);

  // Determine which notes to show initially
  useEffect(() => {
    if (documentNotes) setActiveNoteType("document");
    else if (videoNotes) setActiveNoteType("video");
    else setActiveNoteType(null);
  }, [documentNotes, videoNotes]);

  const renderNotesContent = (
    notes: string | null | undefined,
    type: "document" | "video"
  ) => {
    if (!notes) {
      return (
        <p className="text-muted-foreground">No {type} notes generated yet.</p>
      );
    }

    // Clean up the content - remove markdown code fences if they exist
    let cleanedNotes = notes;

    // Remove ```markdown at the start and ``` at the end
    if (cleanedNotes.startsWith("```markdown\n")) {
      cleanedNotes = cleanedNotes.substring(12); // Remove '```markdown\n'
    } else if (cleanedNotes.startsWith("```markdown")) {
      cleanedNotes = cleanedNotes.substring(11); // Remove '```markdown'
    }

    if (cleanedNotes.endsWith("\n```")) {
      cleanedNotes = cleanedNotes.substring(0, cleanedNotes.length - 4); // Remove '\n```'
    } else if (cleanedNotes.endsWith("```")) {
      cleanedNotes = cleanedNotes.substring(0, cleanedNotes.length - 3); // Remove '```'
    }

    // Also handle other common code fence patterns
    cleanedNotes = cleanedNotes
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/i, "");

    return (
      <div className="bg-muted p-4 rounded-md max-h-[70vh] overflow-auto">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom styling for markdown elements
            h1: ({ children, ...props }) => (
              <h1
                className="text-2xl font-bold mb-4 text-foreground border-b border-border pb-2 mt-6 first:mt-0"
                {...props}
              >
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2
                className="text-xl font-semibold mb-3 text-foreground mt-6 border-b border-border pb-1 first:mt-0"
                {...props}
              >
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3
                className="text-lg font-medium mb-2 text-foreground mt-4 first:mt-0"
                {...props}
              >
                {children}
              </h3>
            ),
            h4: ({ children, ...props }) => (
              <h4
                className="text-base font-medium mb-2 text-foreground mt-3 first:mt-0"
                {...props}
              >
                {children}
              </h4>
            ),
            h5: ({ children, ...props }) => (
              <h5
                className="text-sm font-medium mb-2 text-foreground mt-3 first:mt-0"
                {...props}
              >
                {children}
              </h5>
            ),
            h6: ({ children, ...props }) => (
              <h6
                className="text-sm font-medium mb-2 text-foreground mt-3 first:mt-0"
                {...props}
              >
                {children}
              </h6>
            ),
            p: ({ children, ...props }) => (
              <p className="mb-3 text-foreground leading-relaxed" {...props}>
                {children}
              </p>
            ),
            ul: ({ children, ...props }) => (
              <ul
                className="list-disc list-outside ml-6 mb-4 text-foreground space-y-1"
                {...props}
              >
                {children}
              </ul>
            ),
            ol: ({ children, ...props }) => (
              <ol
                className="list-decimal list-outside ml-6 mb-4 text-foreground space-y-1"
                {...props}
              >
                {children}
              </ol>
            ),
            li: ({ children, ...props }) => (
              <li className="mb-1 text-foreground" {...props}>
                {children}
              </li>
            ),
            code: ({ children, ...props }) => (
              <code
                className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-foreground"
                {...props}
              >
                {children}
              </code>
            ),
            pre: ({ children, ...props }) => (
              <pre
                className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto mb-4 text-foreground"
                {...props}
              >
                {children}
              </pre>
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote
                className="border-l-4 border-blue-500 pl-4 italic mb-4 text-foreground bg-gray-50 dark:bg-gray-800 py-2 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            ),
            strong: ({ children, ...props }) => (
              <strong className="font-semibold text-foreground" {...props}>
                {children}
              </strong>
            ),
            em: ({ children, ...props }) => (
              <em className="italic text-foreground" {...props}>
                {children}
              </em>
            ),
            hr: ({ ...props }) => (
              <hr className="my-6 border-t border-border" {...props} />
            ),
            a: ({ children, ...props }) => (
              <a
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                {...props}
              >
                {children}
              </a>
            ),
          }}
        >
          {cleanedNotes}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Automated Notes</CardTitle>
        <CardDescription>
          Generate concise notes from your uploaded documents or video
          transcripts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-2 border-b pb-4">
          {hasDocumentContent && (
            <Button
              variant={activeNoteType === "document" ? "default" : "outline"}
              onClick={() => setActiveNoteType("document")}
              disabled={isGeneratingDocumentNotes || isGeneratingVideoNotes}
            >
              Document Notes
            </Button>
          )}
          {hasVideoTranscript && (
            <Button
              variant={activeNoteType === "video" ? "default" : "outline"}
              onClick={() => setActiveNoteType("video")}
              disabled={isGeneratingDocumentNotes || isGeneratingVideoNotes}
            >
              Video Transcript Notes
            </Button>
          )}
        </div>

        {activeNoteType === "document" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Notes from Document</h3>
              {!documentNotes && hasDocumentContent && (
                <Button
                  onClick={onGenerateDocumentNotes}
                  disabled={isGeneratingDocumentNotes}
                >
                  {isGeneratingDocumentNotes
                    ? "Generating..."
                    : "Generate Document Notes"}
                </Button>
              )}
            </div>
            {isGeneratingDocumentNotes && (
              <p>Generating document notes, please wait...</p>
            )}
            {!isGeneratingDocumentNotes &&
              renderNotesContent(documentNotes, "document")}
          </div>
        )}

        {activeNoteType === "video" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                Notes from Video Transcript
              </h3>
              {!videoNotes && hasVideoTranscript && (
                <Button
                  onClick={onGenerateVideoNotes}
                  disabled={isGeneratingVideoNotes}
                >
                  {isGeneratingVideoNotes
                    ? "Generating..."
                    : "Generate Video Notes"}
                </Button>
              )}
            </div>
            {isGeneratingVideoNotes && (
              <p>Generating video notes, please wait...</p>
            )}
            {!isGeneratingVideoNotes && renderNotesContent(videoNotes, "video")}
          </div>
        )}

        {!activeNoteType && (
          <p className="text-muted-foreground text-center py-8">
            {hasDocumentContent || hasVideoTranscript
              ? "Select a note type to view or generate notes."
              : "Upload documents or process a video to generate notes."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
