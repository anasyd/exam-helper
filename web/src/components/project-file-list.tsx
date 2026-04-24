"use client";

import { useEffect, useState, useCallback } from "react";
import { FileTextIcon, Download, Trash2, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/client";
import { listProjectFiles, downloadFile, deleteFile, type ProjectFile } from "@/lib/api/files";
import { useFlashcardStore } from "@/lib/store";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ViewerState {
  file: ProjectFile;
  blobUrl: string;
}

interface Props {
  projectId: string;
  onDelete?: (fileId: string) => void;
  refreshKey?: number;
}

export function ProjectFileList({ projectId, onDelete, refreshKey }: Props) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const list = await listProjectFiles(projectId);
      setFiles(list);
    } finally {
      setLoading(false);
    }
  }, [projectId, session?.user]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Revoke blob URL when viewer closes
  useEffect(() => {
    if (!viewer) return;
    return () => URL.revokeObjectURL(viewer.blobUrl);
  }, [viewer]);

  async function handleView(file: ProjectFile) {
    setViewingId(file.fileId);
    try {
      const res = await fetch(`${BASE}/api/files/${file.fileId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (file.contentType === "application/pdf") {
        window.open(blobUrl, "_blank");
        // Delay revoke slightly so the new tab has time to load
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      } else {
        setViewer({ file, blobUrl });
      }
    } catch {
      toast.error("Could not open file");
    } finally {
      setViewingId(null);
    }
  }

  function handleCloseViewer() {
    if (viewer) URL.revokeObjectURL(viewer.blobUrl);
    setViewer(null);
  }

  async function handleDownload(file: ProjectFile) {
    setDownloadingId(file.fileId);
    try {
      await downloadFile(file.fileId, file.fileName);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(file: ProjectFile) {
    setDeletingId(file.fileId);
    try {
      await deleteFile(file.fileId);
      setFiles((prev) => prev.filter((f) => f.fileId !== file.fileId));
      const project = useFlashcardStore.getState().projects.find((p) => p.id === projectId);
      if (project?.documentFileId === file.fileId) {
        useFlashcardStore.getState().updateProject(projectId, {
          documentFileId: undefined,
          documentFileName: undefined,
        });
      }
      onDelete?.(file.fileId);
      toast.success(`Deleted ${file.fileName}`);
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const isViewable = (file: ProjectFile) =>
    file.contentType === "application/pdf" ||
    file.contentType.startsWith("image/") ||
    file.contentType === "text/plain";

  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading files…
      </div>
    );
  }

  if (files.length === 0) return null;

  return (
    <>
      <div className="mt-3 space-y-1">
        {files.map((file) => (
          <div
            key={file.fileId}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate font-medium">{file.fileName}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>

            {isViewable(file) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title={file.contentType === "application/pdf" ? "Open PDF" : "View"}
                disabled={viewingId === file.fileId}
                onClick={() => void handleView(file)}
              >
                {viewingId === file.fileId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Download"
              disabled={downloadingId === file.fileId}
              onClick={() => void handleDownload(file)}
            >
              {downloadingId === file.fileId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              title="Delete"
              disabled={deletingId === file.fileId}
              onClick={() => void handleDelete(file)}
            >
              {deletingId === file.fileId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* File viewer dialog (images and text only — PDFs open in new tab) */}
      <Dialog open={!!viewer} onOpenChange={(open) => !open && handleCloseViewer()}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-sm font-medium truncate pr-8">
              {viewer?.file.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewer && viewer.file.contentType.startsWith("image/") && (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewer.blobUrl}
                  alt={viewer.file.fileName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            {viewer && viewer.file.contentType === "text/plain" && (
              <TextFileViewer blobUrl={viewer.blobUrl} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TextFileViewer({ blobUrl }: { blobUrl: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    fetch(blobUrl)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText("Could not load file content."));
  }, [blobUrl]);

  if (text === null) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <pre className="w-full h-full overflow-auto p-4 text-sm font-mono whitespace-pre-wrap">
      {text}
    </pre>
  );
}
