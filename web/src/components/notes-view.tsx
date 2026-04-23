"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Loader2, FileText, Video, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";

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

interface HeadingEntry {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractHeadings(markdown: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const seenIds: Record<string, number> = {};
  const lines = markdown.split("\n");
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      let id = slugify(text);
      if (seenIds[id]) { id = `${id}-${seenIds[id]}`; }
      seenIds[id] = (seenIds[id] ?? 0) + 1;
      headings.push({ level, text, id });
    }
  }
  return headings;
}

function cleanMarkdown(raw: string): string {
  return raw
    .replace(/^```markdown\s*\n?/gm, "")
    .replace(/\n?```$/gm, "")
    .replace(/^```[a-z]*\s*\n?/gim, "")
    .trim();
}

function NotesContent({ notes }: { notes: string }) {
  const clean = cleanMarkdown(notes);
  const headings = extractHeadings(clean);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>("");

  // Highlight active section on scroll
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => {
      const allHeadings = el.querySelectorAll("h1[id],h2[id],h3[id]");
      let found = "";
      for (const h of allHeadings) {
        const rect = h.getBoundingClientRect();
        if (rect.top <= 120) found = h.id;
      }
      if (found) setActiveId(found);
    };
    const scrollable = el.closest(".notes-scroll") as HTMLElement | null;
    (scrollable ?? window).addEventListener("scroll", handleScroll, { passive: true });
    return () => (scrollable ?? window).removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const target = contentRef.current?.querySelector(`#${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex gap-6">
      {/* TOC sidebar */}
      {headings.length > 0 && (
        <aside className="hidden md:block w-52 shrink-0">
          <div className="sticky top-4 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-2">
              Contents
            </p>
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => scrollTo(h.id)}
                className={`block w-full text-left text-sm px-2 py-1 rounded transition-colors truncate
                  ${h.level === 1 ? "font-semibold" : h.level === 2 ? "pl-4" : "pl-6"}
                  ${activeId === h.id
                    ? "text-foreground bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                {h.text}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Content */}
      <div ref={contentRef} className="flex-1 min-w-0">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, rehypeSlug]}
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children, ...props }) => (
              <h1 className="text-2xl font-bold mb-3 text-foreground border-b border-border pb-2 mt-8 first:mt-0" {...props}>{children}</h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 className="text-lg font-semibold mb-2 text-foreground mt-6 first:mt-0" {...props}>{children}</h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 className="text-base font-medium mb-2 text-foreground mt-4 first:mt-0" {...props}>{children}</h3>
            ),
            p: ({ children, ...props }) => (
              <p className="mb-3 text-foreground leading-relaxed" {...props}>{children}</p>
            ),
            ul: ({ children, ...props }) => (
              <ul className="list-disc list-outside ml-5 mb-4 text-foreground space-y-1" {...props}>{children}</ul>
            ),
            ol: ({ children, ...props }) => (
              <ol className="list-decimal list-outside ml-5 mb-4 text-foreground space-y-1" {...props}>{children}</ol>
            ),
            li: ({ children, ...props }) => (
              <li className="text-foreground leading-relaxed" {...props}>{children}</li>
            ),
            code: ({ children, ...props }) => (
              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground" {...props}>{children}</code>
            ),
            pre: ({ children, ...props }) => (
              <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-4 text-foreground" {...props}>{children}</pre>
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote className="border-l-4 border-border pl-4 italic mb-4 text-muted-foreground" {...props}>{children}</blockquote>
            ),
            strong: ({ children, ...props }) => (
              <strong className="font-semibold text-foreground" {...props}>{children}</strong>
            ),
            hr: ({ ...props }) => <hr className="my-6 border-t border-border" {...props} />,
            a: ({ children, ...props }) => (
              <a className="text-primary underline hover:opacity-80" {...props}>{children}</a>
            ),
          }}
        >
          {clean}
        </ReactMarkdown>
      </div>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<"document" | "video">("document");
  const hasBoth = hasDocumentContent && hasVideoTranscript;

  useEffect(() => {
    if (documentNotes) setActiveTab("document");
    else if (videoNotes) setActiveTab("video");
  }, [documentNotes, videoNotes]);

  const activeNotes = activeTab === "document" ? documentNotes : videoNotes;
  const isGenerating = activeTab === "document" ? isGeneratingDocumentNotes : isGeneratingVideoNotes;
  const hasContent = activeTab === "document" ? hasDocumentContent : hasVideoTranscript;
  const handleGenerate = activeTab === "document" ? onGenerateDocumentNotes : onGenerateVideoNotes;

  return (
    <div className="space-y-5">
      {/* Tab switcher — only shown if both sources exist */}
      {hasBoth && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("document")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activeTab === "document" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            <FileText className="h-3.5 w-3.5" /> Document
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activeTab === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            <Video className="h-3.5 w-3.5" /> Video
          </button>
        </div>
      )}

      {/* Content area */}
      {isGenerating ? (
        <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Generating notes…</span>
        </div>
      ) : activeNotes ? (
        <NotesContent notes={activeNotes} />
      ) : hasContent ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {activeTab === "document" ? <FileText className="h-5 w-5 text-muted-foreground" /> : <Video className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div>
            <p className="font-medium">No notes yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI will summarise your {activeTab === "document" ? "document" : "video"} into structured notes.
            </p>
          </div>
          <Button onClick={handleGenerate} className="gap-2">
            <ChevronRight className="h-4 w-4" />
            Generate notes
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-12">
          Upload a {activeTab === "document" ? "document" : "video"} first to generate notes.
        </p>
      )}
    </div>
  );
}
