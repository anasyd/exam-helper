"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react"; // Added useEffect

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
    // Using <pre> for now as react-markdown installation failed.
    // Replace with <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown> if available
    return (
      <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm font-mono max-h-[70vh] overflow-auto">
        {notes}
      </pre>
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
