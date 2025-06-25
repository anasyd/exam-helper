"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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
  hasVideoTranscript
}: NotesViewProps) {

  const [activeNoteType, setActiveNoteType] = useState<"document" | "video" | null>(null);

  // Determine which notes to show initially
  useEffect(() => {
    if (documentNotes) setActiveNoteType("document");
    else if (videoNotes) setActiveNoteType("video");
    else setActiveNoteType(null);
  }, [documentNotes, videoNotes]);


  const renderNotesContent = (notes: string | null | undefined, type: "document" | "video") => {
    if (!notes) {
      return <p className="text-muted-foreground">No {type} notes generated yet.</p>;
    }
    
    // Render markdown with proper styling
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert bg-muted p-4 rounded-md max-h-[70vh] overflow-auto">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw]} 
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom styling for markdown elements
            h1: ({...props}) => <h1 className="text-2xl font-bold mb-4 text-foreground" {...props} />,
            h2: ({...props}) => <h2 className="text-xl font-semibold mb-3 text-foreground" {...props} />,
            h3: ({...props}) => <h3 className="text-lg font-medium mb-2 text-foreground" {...props} />,
            p: ({...props}) => <p className="mb-3 text-foreground leading-relaxed" {...props} />,
            ul: ({...props}) => <ul className="list-disc list-inside mb-4 text-foreground" {...props} />,
            ol: ({...props}) => <ol className="list-decimal list-inside mb-4 text-foreground" {...props} />,
            li: ({...props}) => <li className="mb-1 text-foreground" {...props} />,
            code: ({...props}) => <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
            pre: ({...props}) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto mb-4" {...props} />,
            blockquote: ({...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic mb-4 text-foreground" {...props} />,
            strong: ({...props}) => <strong className="font-semibold text-foreground" {...props} />,
            em: ({...props}) => <em className="italic text-foreground" {...props} />
          }}
        >
          {notes}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Automated Notes</CardTitle>
        <CardDescription>
          Generate concise notes from your uploaded documents or video transcripts.
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
                <Button onClick={onGenerateDocumentNotes} disabled={isGeneratingDocumentNotes}>
                  {isGeneratingDocumentNotes ? "Generating..." : "Generate Document Notes"}
                </Button>
              )}
            </div>
            {isGeneratingDocumentNotes && <p>Generating document notes, please wait...</p>}
            {!isGeneratingDocumentNotes && renderNotesContent(documentNotes, "document")}
          </div>
        )}

        {activeNoteType === "video" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Notes from Video Transcript</h3>
              {!videoNotes && hasVideoTranscript && (
                <Button onClick={onGenerateVideoNotes} disabled={isGeneratingVideoNotes}>
                  {isGeneratingVideoNotes ? "Generating..." : "Generate Video Notes"}
                </Button>
              )}
            </div>
            {isGeneratingVideoNotes && <p>Generating video notes, please wait...</p>}
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

// Need to add useEffect to the import
// import { useEffect, useState } from "react";
// For now, I will add it manually in the next step if it's not auto-added.
